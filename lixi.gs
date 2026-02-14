function doGet(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return responseJSON({ status: 'error', message: 'Hệ thống đang bận, vui lòng thử lại!' });
  } 

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var p = e.parameter;
    
    // --- 1. CHUẨN HÓA DỮ LIỆU ĐẦU VÀO (Sạch sẽ hơn) ---
    // Nếu không có dữ liệu thì gán bằng chuỗi rỗng "" chứ không để undefined
    var name = (p.name || "").trim();
    var phoneRaw = p.phone || "";
    var phoneInput = normalizePhone(phoneRaw);
    
    var bankInput = (p.bank || "").trim().toLowerCase();
    if (!bankInput) {
       return responseJSON({ status: 'error', message: 'Vui lòng chọn ngân hàng!' });
    }
    var stkInput = (p.stk || "").toString().trim();
    var ip = p.ip || "";
    var phoneDigits = String(phoneRaw || "").replace(/\D/g, '');

    // Validate: thiếu dữ liệu (dùng phoneDigits vì 0000000000 qua normalizePhone sẽ thành "")
    if (phoneDigits.length === 0 || stkInput === "") {
       return responseJSON({ status: 'error', message: 'Dữ liệu gửi lên bị thiếu!' });
    }
    // Validate: SĐT Việt Nam phải đúng 10 số
    if (phoneDigits.length !== 10) {
       return responseJSON({ status: 'error', message: 'Số điện thoại phải đúng 10 số!' });
    }

    // --- 2. KIỂM TRA TRÙNG ---
    var data = sheet.getDataRange().getValues();
    var isDuplicatePhone = false;
    var isDuplicateAccount = false;

    for (var i = 1; i < data.length; i++) {
      var row = data[i];

      // Bỏ qua các hàng dữ liệu rác (hàng trống hoặc undefined)
      if (!row[1] || !row[4]) continue;

      // Check SĐT
      if (normalizePhone(row[1]) === phoneInput) {
        isDuplicatePhone = true;
        break; 
      }

      // Check Ngân Hàng + STK
      var sheetStk = String(row[4]).trim();
      var sheetBank = String(row[5]).trim().toLowerCase();
      
      if (sheetStk === stkInput && sheetBank === bankInput) {
        isDuplicateAccount = true;
        break;
      }
    }

    // --- 3. TRẢ VỀ MÃ LỖI TRÙNG (bỏ qua nếu là user test local) ---
    var isTestUser = isLocalTestUser(name, phoneDigits, stkInput, bankInput);
    if (!isTestUser) {
      if (isDuplicatePhone) {
        return responseJSON({ status: 'duplicate_phone', message: 'Số điện thoại này đã nhận rồi!' });
      }
      if (isDuplicateAccount) {
        return responseJSON({ status: 'duplicate_stk', message: 'Tài khoản ngân hàng này đã tồn tại!' });
      }
    }

    // --- 4. CHỌN GIẢI TỪ POOL CÒN LẠI ---
    var prize = getLuckyMoneyFromPool(data);
    if (prize === null) {
      return responseJSON({ status: 'error', message: 'Đã hết lộc! Chúc bạn may mắn lần sau.' });
    }

    // --- 5. LƯU VÀO SHEET ---
    sheet.appendRow([new Date(), "'" + phoneRaw, name, prize, "'" + stkInput, p.bank, ip]);

    return responseJSON({ status: 'success', prize: prize });

  } catch (error) {
    return responseJSON({ status: 'error', message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function normalizePhone(raw) {
  if (!raw) return "";
  return String(raw).replace(/\s/g, '').replace(/^0+/, '');
}

// User test local: không bị check trùng (admin, SĐT 0123456789, MBBank, STK 0)
function isLocalTestUser(name, phoneDigits, stkInput, bankInput) {
  var nameOk = (name || "").toLowerCase().trim() === "admin";
  var phoneOk = String(phoneDigits || "").replace(/\D/g, "") === "0123456789";
  var stkOk = String(stkInput || "").trim() === "0";
  var bankOk = (bankInput || "").toLowerCase().indexOf("mb") >= 0;
  return nameOk && phoneOk && stkOk && bankOk;
}

// Số lượng mỗi loại giải: 30x10k, 15x20k, 5x50k, 2x100k (tổng 52 bao)
var PRIZE_LIMITS = { 10000: 30, 20000: 15, 50000: 5, 100000: 2 };

function getLuckyMoneyFromPool(data) {
  // Đếm số giải đã phát cho mỗi mệnh giá
  var used = { 10000: 0, 20000: 0, 50000: 0, 100000: 0 };
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[3] === undefined || row[3] === null || row[3] === "") continue;
    var amount = parseInt(String(row[3]).replace(/,/g, ""), 10);
    if (used.hasOwnProperty(amount)) used[amount]++;
  }

  // Xây pool giải còn lại (mỗi giải còn = thêm vào pool 1 lần)
  var pool = [];
  for (var amt in PRIZE_LIMITS) {
    var limit = PRIZE_LIMITS[amt];
    var remain = limit - (used[parseInt(amt, 10)] || 0);
    for (var j = 0; j < remain; j++) pool.push(parseInt(amt, 10));
  }

  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}