import {Client} from '@notionhq/client'
import {NotionToMarkdown} from 'notion-to-md'
import fs from 'fs'
import path from 'path'

const notion = new Client({auth: process.env.NOTION_TOKEN})
const n2m = new NotionToMarkdown({notionClient: notion})

// 输出目录：改成你动态文件实际所在的文件夹
const OUTPUT_DIR = path.join(process.cwd(), 'src/content/dynamic')

// 脚本生成的文件名格式，清理时只会动匹配这个格式的文件
const GENERATED_NAME = /^\d{4}-\d{2}-\d{2}-\d{6}\.md$/

const getRichText = prop =>
  prop?.rich_text?.map(t => t.plain_text).join('') || ''
const getSelect = prop => prop?.select?.name || ''
const getDate = prop => prop?.date?.start || ''
const getCheckbox = prop => prop?.checkbox || false

// 转成 'YYYY-MM-DD HH:mm:ss'（按东八区）
const toDateTime = str => {
  if (str.length === 10) return `${str} 00:00:00`
  const d = new Date(new Date(str).getTime() + 8 * 3600 * 1000)
  return d.toISOString().replace('T', ' ').substring(0, 19)
}

// '2026-07-15 01:07:56' -> '2026-07-15-010756'
const toBaseName = dt => dt.replace(' ', '-').replace(/:/g, '')

async function getDataSourceId() {
  const database = await notion.databases.retrieve({
    database_id: process.env.NOTION_DYNAMIC_DATABASE_ID
  })
  console.log('数据库对应的数据源：', database.data_sources)
  return database.data_sources[0].id
}

async function syncMoments() {
  const dataSourceId = await getDataSourceId()
  fs.mkdirSync(OUTPUT_DIR, {recursive: true})

  const generated = new Set() // 本次生成的文件名
  let hasMore = true
  let cursor

  try {
    while (hasMore) {
      const res = await notion.dataSources.query({
        data_source_id: dataSourceId,
        ...(cursor ? {start_cursor: cursor} : {})
      })

      for (const page of res.results) {
        const props = page.properties

        if (getSelect(props['status']) !== '已发布') continue

        const date = getDate(props['published'])
        if (!date) {
          console.warn(`跳过缺少发布时间的动态: ${page.id}`)
          continue
        }

        const publishedStr = toDateTime(date)

        // 文件名：发布时间；同一秒内有多条时追加序号避免覆盖
        const base = toBaseName(publishedStr)
        let fileName = `${base}.md`
        let n = 2
        while (generated.has(fileName)) {
          fileName = `${base}-${n++}.md`
        }
        generated.add(fileName)

        const location = getRichText(props['location'])
        let fm = '---\n'
        fm += `published: ${publishedStr}\n`
        fm += `pinned: ${getCheckbox(props['pinned'])}\n`
        if (location) fm += `location: ${location}\n`
        fm += '---\n\n'

        const mdblocks = await n2m.pageToMarkdown(page.id)
        let body = n2m.toMarkdownString(mdblocks).parent
        body = body.replace(/^---\n/, '')

        fs.writeFileSync(path.join(OUTPUT_DIR, fileName), fm + body)
        console.log(`✅ 已生成动态: ${fileName}`)
      }

      hasMore = res.has_more
      cursor = res.next_cursor
    }

    // 清理：删除"符合脚本命名格式、但本次没生成"的旧文件
    // （动态被撤回、或修改了发布时间后，旧文件名会残留）
    for (const file of fs.readdirSync(OUTPUT_DIR)) {
      if (GENERATED_NAME.test(file) && !generated.has(file)) {
        fs.unlinkSync(path.join(OUTPUT_DIR, file))
        console.log(`已清理旧动态: ${file}`)
      }
    }

    console.log('🎉 动态同步完成！')
  } catch (error) {
    console.error('❌ 同步动态失败:', error)
    process.exit(1)
  }
}

syncMoments()
