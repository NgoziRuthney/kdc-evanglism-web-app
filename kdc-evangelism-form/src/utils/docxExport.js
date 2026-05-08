import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, ImageRun, AlignmentType, WidthType, BorderStyle,
  HeadingLevel, ShadingType
} from 'docx'
import { saveAs } from 'file-saver'

const COLUMNS = [
  'Name of Convert/Invitee',
  'Gender',
  'Phone (Calling)',
  'Phone (WhatsApp)',
  'Date Reached',
  'Location Address',
  'Salvation Status',
  'Occupation',
  'Level of Response',
  'Visited KDC',
  'Remarks',
  'Name of Minister'
]

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    year: 'numeric', month: 'short', day: '2-digit'
  })
}

function cellText(text, bold = false, shade = false) {
  return new TableCell({
    shading: shade ? { type: ShadingType.SOLID, color: '1e3a8a', fill: '1e3a8a' } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({
      children: [new TextRun({
        text: text || '-',
        bold,
        size: 18,
        color: shade ? 'FFFFFF' : '111827'
      })]
    })]
  })
}

export async function downloadConvertsDocx(converts, fromDate, toDate) {
  // Fetch logo as ArrayBuffer
  let logoData = null
  try {
    const resp = await fetch('/kdc_logo.png')
    const buffer = await resp.arrayBuffer()
    logoData = new Uint8Array(buffer)  // docx ImageRun requires Uint8Array, not raw ArrayBuffer
  } catch {
    // logo unavailable, skip
  }

  const dateLabel = `${formatDate(fromDate)} – ${formatDate(toDate)}`

  const headerRow = new TableRow({
    tableHeader: true,
    children: COLUMNS.map(col => cellText(col, true, true))
  })

  const dataRows = converts.map(c =>
    new TableRow({
      children: [
        cellText(c.full_name),
        cellText(c.gender),
        cellText(c.phone_calling),
        cellText(c.phone_whatsapp),
        cellText(formatDate(c.date_reached)),
        cellText(c.location_address),
        cellText(c.salvation_status),
        cellText(c.occupation),
        cellText(c.level_of_response),
        cellText(c.visited_kdc),
        cellText(c.remark),
        cellText(c.minister_name)
      ]
    })
  )

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
      insideH: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
      insideV: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' }
    }
  })

  const children = []

  if (logoData) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({
        data: logoData,
        transformation: { width: 180, height: 72 },
        type: 'png'
      })]
    }))
    children.push(new Paragraph({ text: '' }))
  }

  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: 'KDC Evangelism — Convert/Invitee Report',
      bold: true, size: 28, color: '1e3a8a'
    })]
  }))

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: `Period: ${dateLabel}   |   Total Records: ${converts.length}`,
      size: 20, color: '6b7280', italics: true
    })]
  }))

  children.push(new Paragraph({ text: '' }))
  children.push(table)
  children.push(new Paragraph({ text: '' }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: `Generated on ${new Date().toLocaleString('en-GB')}`,
      size: 16, color: '9ca3af', italics: true
    })]
  }))

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { orientation: 'landscape' },
          margin: { top: 720, bottom: 720, left: 720, right: 720 }
        }
      },
      children
    }]
  })

  const blob = await Packer.toBlob(doc)
  const filename = `KDC_Converts_${fromDate}_to_${toDate}.docx`
  saveAs(blob, filename)
}
