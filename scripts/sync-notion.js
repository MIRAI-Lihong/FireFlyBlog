import {Client} from '@notionhq/client'
import {NotionToMarkdown} from 'notion-to-md'
import fs from 'fs'
import path from 'path'

const notion = new Client({auth: process.env.NOTION_TOKEN})
const n2m = new NotionToMarkdown({notionClient: notion})

const publishedSlugs = new Set()
const withdrawnSlugs = new Set()

// === 辅助函数：安全获取 Notion 属性 ===
const getTitle = prop => prop?.title?.map(t => t.plain_text).join('') || ''
const getRichText = prop =>
  prop?.rich_text?.map(t => t.plain_text).join('') || ''
const getSelect = prop => prop?.select?.name || ''
const getMultiSelect = prop => prop?.multi_select?.map(item => item.name) || []
const getDate = prop => prop?.date?.start || ''
const getCheckbox = prop => prop?.checkbox || false

// === 辅助函数：生成安全的 YAML 字符串（处理单引号） ===
const yamlStr = str => `'${str.replace(/'/g, "''")}'`
// === 辅助函数：转换日期字符串 '2026-10-10' -> 2026-10-10 ===
const toDate = str => new Date(str).toISOString().substring(0, 10)

// === 辅助函数：获取数据库对应的数据源 ID ===
async function getDataSourceId() {
  const database = await notion.databases.retrieve({
    database_id: process.env.NOTION_DATABASE_ID
  })

  console.log('数据库对应的数据源：', database.data_sources)

  return database.data_sources[0].id
}

async function syncNotion() {
  let hasMore = true
  let nextCursor = undefined
  const dataSourceId = await getDataSourceId()

  // 确保输出目录存在
  const outputDir = path.join(process.cwd(), 'src/content/posts')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, {recursive: true})
  }

  console.log('开始从 Notion 同步文章...')

  try {
    while (hasMore) {
      const res = await notion.dataSources.query({
        data_source_id: dataSourceId,
        ...(nextCursor ? {start_cursor: nextCursor} : {})
      })

      for (const page of res.results) {
        const props = page.properties

        // 1. 提取所有字段（严格对照你图片中的字段名）
        const title = getTitle(props['title'])
        const slug = getRichText(props['slug'])
        const published = getDate(props['published'])
        const tags = getMultiSelect(props['tags'])
        const category = getSelect(props['category'])
        const description = getRichText(props['description'])
        const series = getSelect(props['series'])
        const toc = getCheckbox(props['toc'])
        const password = getRichText(props['password'])
        const status = getSelect(props['status'])
        const cover = getRichText(props['cover'])

        // 如果缺少 slug，跳过该文章并提示
        if (!slug) {
          console.warn(`跳过缺少 slug 的文章: ${title}`)
          continue
        }

        if (status !== '已发布') {
          withdrawnSlugs.add(slug)
          continue
        }

        publishedSlugs.add(slug)

        // 2. 构建 Frontmatter
        let frontmatter = '---\n'
        frontmatter += `title: ${yamlStr(title)}\n`
        frontmatter += `published: ${toDate(published)}\n`
        frontmatter += `description: ${yamlStr(description)}\n`

        // 可选字段：有值才写入
        if (category) frontmatter += `category: ${yamlStr(category)}\n`
        if (series) frontmatter += `series: ${yamlStr(series)}\n`
        if (password) frontmatter += `password: ${yamlStr(password)}\n`
        if (cover) frontmatter += `cover: ${yamlStr(cover)}\n`

        frontmatter += `toc: ${toc}\n` // 布尔值不需要引号

        // 数组字段：tags
        if (tags.length > 0) {
          frontmatter += 'tags:\n'
          tags.forEach(tag => {
            frontmatter += `  - ${yamlStr(tag)}\n`
          })
        } else {
          frontmatter += 'tags: []\n'
        }

        frontmatter += '---\n\n'

        // 3. 转换正文
        const mdblocks = await n2m.pageToMarkdown(page.id)
        let mdString = n2m.toMarkdownString(mdblocks).parent

        // 预防性处理：如果 Markdown 正文开头有 ---，避免和 frontmatter 冲突
        mdString = mdString.replace(/^---\n/, '')

        // 4. 写入文件
        const filePath = path.join(outputDir, `${slug}.md`)
        fs.writeFileSync(filePath, frontmatter + mdString)
        console.log(`✅ 已生成文章: ${filePath}`)
      }

      hasMore = res.has_more
      nextCursor = res.next_cursor
    }
    for (const slug of withdrawnSlugs) {
      // 只删除本次已确认撤回的文章
      if (publishedSlugs.has(slug)) {
        console.warn(`文章状态存在冲突，跳过删除: ${slug}`)
        continue
      }

      const filePath = path.join(outputDir, `${slug}.md`)

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log(`已删除撤回文章: ${filePath}`)
      }
    }
    console.log('🎉 同步完成！')
  } catch (error) {
    console.error('❌ 同步 Notion 失败:', error)
    process.exit(1) // 让 GitHub Actions 捕获错误并中断构建
  }
}

syncNotion()
