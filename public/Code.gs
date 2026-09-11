/**
 * SISTEM SKORING DIGITAL PENCAK SILAT IPSI
 * Google Apps Script Webhook (Code.gs)
 * 
 * Petunjuk Penggunaan:
 * 1. Buka spreadsheet Google Sheets Anda
 * 2. Klik menu Ekstensi -> Apps Script
 * 3. Hapus kode bawaan dan tempel kode ini seluruhnya
 * 4. Klik Terapkan (Deploy) -> Penerapan Baru (New Deployment)
 * 5. Pilih jenis "Web app" (Aplikasi Web)
 * 6. Setel "Execute as" ke "Me" dan "Who has access" ke "Anyone" (Siapa saja)
 * 7. Salin Web app URL ke panel sistem skoring
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000); // Kunci selama 30 detik untuk cegah race condition multi-arena

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ status: 'error', message: 'Payload data kosong' });
    }

    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Tes Koneksi / Ping
    if (data.action === 'PING') {
      return responseJSON({
        status: 'ok',
        title: ss.getName(),
        sheets: ss.getSheets().map(function(s) { return s.getName(); })
      });
    }

    // 2. Sinkronisasi Seluruh Tab (Peserta, Tanding, Seni, Klasemen, Jadwal)
    if (data.sheets) {
      for (var sheetName in data.sheets) {
        var rows = data.sheets[sheetName];
        if (rows && rows.length > 0) {
          var sheet = ss.getSheetByName(sheetName);
          if (!sheet) {
            sheet = ss.insertSheet(sheetName);
          }
          
          sheet.clear();
          
          var numRows = rows.length;
          var numCols = rows[0].length;
          var range = sheet.getRange(1, 1, numRows, numCols);
          range.setValues(rows);

          // Format Header Baris Pertama
          var headerRange = sheet.getRange(1, 1, 1, numCols);
          headerRange.setFontWeight("bold");
          headerRange.setBackground("#0f172a");
          headerRange.setFontColor("#ffffff");
          headerRange.setHorizontalAlignment("center");
          
          sheet.setFrozenRows(1);
          
          for (var c = 1; c <= Math.min(numCols, 15); c++) {
            sheet.autoResizeColumn(c);
          }
        }
      }

      return responseJSON({
        status: 'success',
        message: 'Seluruh data kejuaraan berhasil diperbarui di Google Sheets!'
      });
    }

    // 3. Tambah Baris Partai Selesai (Append Row)
    if (data.action === 'APPEND_MATCH' && data.sheetName && data.row) {
      var targetSheet = ss.getSheetByName(data.sheetName);
      if (!targetSheet) {
        targetSheet = ss.insertSheet(data.sheetName);
      }
      targetSheet.appendRow(data.row);
      return responseJSON({ status: 'success', message: 'Baris data berhasil ditambahkan' });
    }

    return responseJSON({ status: 'ignored', message: 'Aksi tidak diketahui' });

  } catch (err) {
    return responseJSON({ status: 'error', error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = (e && e.parameter && e.parameter.sheet) ? e.parameter.sheet : 'DATA PESERTA';
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return responseJSON({ status: 'error', message: 'Sheet "' + sheetName + '" tidak ditemukan' });
    }

    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      return responseJSON({ status: 'success', count: 0, data: [] });
    }

    var headers = values[0];
    var data = [];

    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var item = {};
      for (var j = 0; j < headers.length; j++) {
        item[headers[j]] = row[j];
      }
      data.push(item);
    }

    return responseJSON({ status: 'success', sheet: sheetName, count: data.length, data: data });

  } catch (err) {
    return responseJSON({ status: 'error', error: err.toString() });
  }
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
