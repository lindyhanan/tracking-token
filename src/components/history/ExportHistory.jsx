import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { formatTokenLabel } from '@/lib/tokenUtils'

// ── Utilitas Pembuat ZIP (Store / Uncompressed) untuk File .xlsx Asli ──
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

function crc32(bytes) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function createZipBlob(files) {
  const encoder = new TextEncoder()
  const fileEntries = files.map((f) => {
    const nameBytes = encoder.encode(f.name)
    const dataBytes = typeof f.content === 'string' ? encoder.encode(f.content) : f.content
    const crc = crc32(dataBytes)
    return { nameBytes, dataBytes, crc }
  })

  let offset = 0
  const localParts = []
  const centralParts = []

  for (const entry of fileEntries) {
    const { nameBytes, dataBytes, crc } = entry
    const size = dataBytes.length

    // Local file header (30 bytes + file name)
    const localHeader = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(localHeader.buffer)
    lv.setUint32(0, 0x04034b50, true) // signature
    lv.setUint16(4, 20, true) // version needed
    lv.setUint16(6, 0x0800, true) // UTF-8 flag
    lv.setUint16(8, 0, true) // compression: store
    lv.setUint16(10, 0, true) // mod time
    lv.setUint16(12, 0x5421, true) // mod date
    lv.setUint32(14, crc, true) // crc32
    lv.setUint32(18, size, true) // compressed size
    lv.setUint32(22, size, true) // uncompressed size
    lv.setUint16(26, nameBytes.length, true) // file name length
    lv.setUint16(28, 0, true) // extra length
    localHeader.set(nameBytes, 30)

    localParts.push(localHeader, dataBytes)

    // Central directory header (46 bytes + file name)
    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(centralHeader.buffer)
    cv.setUint32(0, 0x02014b50, true) // signature
    cv.setUint16(4, 20, true) // version made by
    cv.setUint16(6, 20, true) // version needed
    cv.setUint16(8, 0x0800, true) // UTF-8 flag
    cv.setUint16(10, 0, true) // compression: store
    cv.setUint16(12, 0, true) // mod time
    cv.setUint16(14, 0x5421, true) // mod date
    cv.setUint32(16, crc, true) // crc32
    cv.setUint32(20, size, true) // compressed size
    cv.setUint32(24, size, true) // uncompressed size
    cv.setUint16(28, nameBytes.length, true) // file name length
    cv.setUint16(30, 0, true) // extra field length
    cv.setUint16(32, 0, true) // comment length
    cv.setUint16(34, 0, true) // disk number
    cv.setUint16(36, 0, true) // internal attrs
    cv.setUint32(38, 0, true) // external attrs
    cv.setUint32(42, offset, true) // local header offset
    centralHeader.set(nameBytes, 46)

    centralParts.push(centralHeader)
    offset += localHeader.length + size
  }

  const centralSize = centralParts.reduce((acc, p) => acc + p.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true) // EOCD signature
  ev.setUint16(4, 0, true) // disk number
  ev.setUint16(6, 0, true) // central dir disk
  ev.setUint16(8, fileEntries.length, true) // entries on disk
  ev.setUint16(10, fileEntries.length, true) // total entries
  ev.setUint32(12, centralSize, true) // central dir size
  ev.setUint32(16, offset, true) // central dir offset
  ev.setUint16(20, 0, true) // comment length

  return new Blob([...localParts, ...centralParts, eocd], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function escapeXml(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']

function createCellXml(colIdx, rowNumber, value, styleIndex, type = 'str') {
  const ref = `${COL_LETTERS[colIdx]}${rowNumber}`
  if (type === 'num' && typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}" s="${styleIndex}"><v>${value}</v></c>`
  }
  const safeText = escapeXml(value)
  return `<c r="${ref}" s="${styleIndex}" t="inlineStr"><is><t>${safeText}</t></is></c>`
}

function buildStylesXml() {
  // Daftar Style Index (cellXfs):
  // 0: Default
  // 1: Judul Utama "PT BESMINDO MATERI SEWATAMA" (Navy #1E3A8A, Putih Bold 15pt, Center)
  // 2: Subjudul "RIWAYAT TOKEN" (Blue #2563EB, Putih Bold 12pt, Center)
  // 3: Bar Info Ringkasan (Soft Blue #EFF6FF, Navy Text 10pt, Center, Border)
  // 4: Header Tabel (Dark Slate #1E293B, Putih Bold 10.5pt, Center, Border)
  // 5: Data Text Center - Baris Genap (Putih)
  // 6: Data Text Center - Baris Ganjil (Abu Muda #F8FAFC)
  // 7: Data Text Left Wrap - Baris Genap (Putih)
  // 8: Data Text Left Wrap - Baris Ganjil (Abu Muda #F8FAFC)
  // 9: Data Angka Normal Right - Baris Genap (Putih)
  // 10: Data Angka Normal Right - Baris Ganjil (Abu Muda #F8FAFC)
  // 11: Badge Aksi "Penambahan" (Hijau Muda #DCFCE7, Teks Hijau Tua Bold, Center)
  // 12: Badge Aksi "Pengurangan" (Merah Muda #FEE2E2, Teks Merah Tua Bold, Center)
  // 13: Angka Jumlah Penambahan (+ Hijau Bold, Right)
  // 14: Angka Jumlah Pengurangan (- Merah Bold, Right)
  // 15: Baris Total Footer Label (Abu #E2E8F0, Bold, Center, Border)
  // 16: Baris Total Footer Nilai (Abu #E2E8F0, Bold, Right, Border)
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="#,##0"/>
  </numFmts>
  <fonts count="9">
    <font><sz val="10"/><color rgb="FF1E293B"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="15"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="11.5"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="9.5"/><color rgb="FF1E3A8A"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FF166534"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FF991B1B"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FF0F172A"/><name val="Segoe UI"/><family val="2"/></font>
    <font><sz val="10"/><color rgb="FF334155"/><name val="Segoe UI"/><family val="2"/></font>
  </fonts>
  <fills count="11">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E3A8A"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FF94A3B8"/></left>
      <right style="thin"><color rgb="FF94A3B8"/></right>
      <top style="medium"><color rgb="FF475569"/></top>
      <bottom style="medium"><color rgb="FF475569"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="17">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="8" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="8" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="8" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="8" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="164" fontId="7" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="164" fontId="7" fillId="7" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="5" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="6" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="5" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="6" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="7" fillId="10" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="7" fillId="10" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`
}

/**
 * Export riwayat token ke file Excel (.xlsx) asli dengan styling penuh,
 * header PT BESMINDO MATERI SEWATAMA, subjudul Riwayat Token, dan lebar kolom otomatis.
 */
export default function ExportHistory({ history }) {
  const { user, profile } = useAuth()
  const currentUserName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Pengguna'

  const handleExport = () => {
    if (!history || history.length === 0) {
      alert('Tidak ada riwayat untuk diekspor')
      return
    }

    const numFmt = new Intl.NumberFormat('id-ID')
    const now = new Date()
    const printedAt = now.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    let totalAdd = 0
    let totalReduce = 0

    const formattedRows = history.map((h, index) => {
      const qty = Number(h.quantity_changed || 0)
      const isAdd = h.action_type === 'add'
      const isReduce = h.action_type === 'reduce'
      if (isAdd) totalAdd += qty
      if (isReduce) totalReduce += qty

      const dateStr = h.performed_at
        ? new Date(h.performed_at).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '-'

      const actionLabel = isAdd ? 'Penambahan' : isReduce ? 'Pengurangan' : 'Update'
      const signedQty = `${isAdd ? '+' : isReduce ? '-' : ''}${numFmt.format(qty)}`
      const desc = (h.description || '-').replace(/\r?\n/g, ' ').trim()
      const performer = h.performer?.full_name || currentUserName

      return {
        no: index + 1,
        dateStr,
        tokenLabel: formatTokenLabel(h.token_type),
        actionLabel,
        isAdd,
        isReduce,
        signedQty,
        stockBefore: Number(h.stock_before ?? 0),
        stockAfter: Number(h.stock_after ?? 0),
        desc,
        performer,
      }
    })

    // Hitung lebar kolom otomatis agar tidak ada teks yang saling timpa / terpotong
    const headers = [
      'No',
      'Tanggal & Waktu',
      'Jenis Token',
      'Aksi',
      'Jumlah',
      'Stok Sebelum',
      'Stok Sesudah',
      'Keterangan',
      'Oleh',
    ]

    const colWidths = [
      7,  // No
      22, // Tanggal & Waktu
      20, // Jenis Token
      16, // Aksi
      15, // Jumlah
      16, // Stok Sebelum
      16, // Stok Sesudah
      42, // Keterangan
      24, // Oleh
    ]

    formattedRows.forEach((r) => {
      colWidths[1] = Math.max(colWidths[1], r.dateStr.length + 4)
      colWidths[2] = Math.max(colWidths[2], r.tokenLabel.length + 5)
      colWidths[4] = Math.max(colWidths[4], r.signedQty.length + 5)
      colWidths[7] = Math.min(65, Math.max(colWidths[7], Math.min(r.desc.length + 6, 65)))
      colWidths[8] = Math.max(colWidths[8], r.performer.length + 5)
    })

    const colsXml = colWidths
      .map(
        (w, idx) =>
          `<col min="${idx + 1}" max="${idx + 1}" width="${w}" customWidth="1"/>`
      )
      .join('')

    const rowsXml = []

    // Baris 1: PT BESMINDO MATERI SEWATAMA
    const row1Cells = COL_LETTERS.map((_, i) =>
      createCellXml(i, 1, i === 0 ? 'PT BESMINDO MATERI SEWATAMA' : '', 1, 'str')
    ).join('')
    rowsXml.push(`<row r="1" ht="34" customHeight="1">${row1Cells}</row>`)

    // Baris 2: RIWAYAT TOKEN
    const row2Cells = COL_LETTERS.map((_, i) =>
      createCellXml(i, 2, i === 0 ? 'RIWAYAT TOKEN' : '', 2, 'str')
    ).join('')
    rowsXml.push(`<row r="2" ht="25" customHeight="1">${row2Cells}</row>`)

    // Baris 3: Ringkasan Waktu Cetak & Total
    const summaryBanner = `Dicetak: ${printedAt}   |   Total Transaksi: ${formattedRows.length}   |   Total Masuk: +${numFmt.format(totalAdd)} unit   |   Total Keluar: -${numFmt.format(totalReduce)} unit`
    const row3Cells = COL_LETTERS.map((_, i) =>
      createCellXml(i, 3, i === 0 ? summaryBanner : '', 3, 'str')
    ).join('')
    rowsXml.push(`<row r="3" ht="22" customHeight="1">${row3Cells}</row>`)

    // Baris 4: Spacer kosong
    rowsXml.push(`<row r="4" ht="10" customHeight="1"/>`)

    // Baris 5: Header Tabel
    const headerCells = headers
      .map((h, i) => createCellXml(i, 5, h, 4, 'str'))
      .join('')
    rowsXml.push(`<row r="5" ht="28" customHeight="1">${headerCells}</row>`)

    // Baris 6..N: Data Tabel
    formattedRows.forEach((r, idx) => {
      const rowNum = 6 + idx
      const isEven = idx % 2 === 0
      const centerStyle = isEven ? 5 : 6
      const leftStyle = isEven ? 7 : 8
      const numStyle = isEven ? 9 : 10
      const actionStyle = r.isAdd ? 11 : r.isReduce ? 12 : centerStyle
      const qtyStyle = r.isAdd ? 13 : r.isReduce ? 14 : numStyle

      // Sesuaikan tinggi baris otomatis jika keterangan panjang agar tidak terpotong
      const estimatedLines = Math.max(1, Math.ceil(r.desc.length / (colWidths[7] - 4)))
      const rowHeight = Math.max(23, estimatedLines * 18 + 6)

      const cells = [
        createCellXml(0, rowNum, r.no, centerStyle, 'num'),
        createCellXml(1, rowNum, r.dateStr, centerStyle, 'str'),
        createCellXml(2, rowNum, r.tokenLabel, leftStyle, 'str'),
        createCellXml(3, rowNum, r.actionLabel, actionStyle, 'str'),
        createCellXml(4, rowNum, r.signedQty, qtyStyle, 'str'),
        createCellXml(5, rowNum, r.stockBefore, numStyle, 'num'),
        createCellXml(6, rowNum, r.stockAfter, numStyle, 'num'),
        createCellXml(7, rowNum, r.desc, leftStyle, 'str'),
        createCellXml(8, rowNum, r.performer, leftStyle, 'str'),
      ].join('')

      rowsXml.push(`<row r="${rowNum}" ht="${rowHeight}" customHeight="1">${cells}</row>`)
    })

    // Baris Terakhir: Ringkasan Total
    const totalRowNum = 6 + formattedRows.length
    const totalCells = [
      createCellXml(0, totalRowNum, `TOTAL (${formattedRows.length} Data)`, 15, 'str'),
      createCellXml(1, totalRowNum, '', 15, 'str'),
      createCellXml(2, totalRowNum, '', 15, 'str'),
      createCellXml(3, totalRowNum, '', 15, 'str'),
      createCellXml(
        4,
        totalRowNum,
        `+${numFmt.format(totalAdd)} / -${numFmt.format(totalReduce)}`,
        16,
        'str'
      ),
      createCellXml(5, totalRowNum, '', 15, 'str'),
      createCellXml(6, totalRowNum, '', 15, 'str'),
      createCellXml(7, totalRowNum, '', 15, 'str'),
      createCellXml(8, totalRowNum, '', 15, 'str'),
    ].join('')
    rowsXml.push(`<row r="${totalRowNum}" ht="26" customHeight="1">${totalCells}</row>`)

    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:I${totalRowNum}"/>
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft" activeCell="A6" sqref="A6"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="22"/>
  <cols>${colsXml}</cols>
  <sheetData>${rowsXml.join('')}</sheetData>
  <mergeCells count="4">
    <mergeCell ref="A1:I1"/>
    <mergeCell ref="A2:I2"/>
    <mergeCell ref="A3:I3"/>
    <mergeCell ref="A${totalRowNum}:D${totalRowNum}"/>
  </mergeCells>
</worksheet>`

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Riwayat Token" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`

    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

    const blob = createZipBlob([
      { name: '[Content_Types].xml', content: contentTypesXml },
      { name: '_rels/.rels', content: relsXml },
      { name: 'xl/workbook.xml', content: workbookXml },
      { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
      { name: 'xl/styles.xml', content: buildStylesXml() },
      { name: 'xl/worksheets/sheet1.xml', content: sheetXml },
    ])

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const fileName = `Riwayat-Token-BMS-${now.toISOString().split('T')[0]}.xlsx`
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="gap-2 border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 cursor-pointer"
    >
      <Download className="h-4 w-4" /> Export Excel
    </Button>
  )
}
