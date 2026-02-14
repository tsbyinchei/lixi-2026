// ==========================================
// THAY LINK GOOGLE APPS SCRIPT CỦA BẠN VÀO ĐÂY
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzJcUHA6VE2HcyOS0bxIyS_ghkKsCIqG3GhKl_k3DQsSOUrEX0IutulCfgYtVRLEUAr/exec'; 
// ==========================================

// Danh sách Ngân hàng (+ Khác để nhập tùy chỉnh)
const bankListDB = [
    "MB Bank (Quân Đội)", "Vietcombank", "Techcombank", "Agribank",
    "BIDV", "VietinBank", "VPBank", "TPBank", "ACB", "Sacombank", 
    "HDBank", "VIB", "MSB", "SHB", "OCB", "SeABank",
    "Momo", "ZaloPay", "Viettel Money", "Cake", "Timo", "Khác"
];

let userData = { ip: 'Checking...' };
let selectedEnvelope = null;
let isTouchDevice = false;

// Khởi chạy khi web tải xong
document.addEventListener('DOMContentLoaded', () => {
    initGrid();
    initBankDropdown();
    initPhoneInput();
    getIP();
    isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
});

// Số điện thoại: chỉ cho phép nhập số, tối đa 10 ký tự
function initPhoneInput() {
    const input = document.getElementById('userPhone');
    input.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    });
}

// Lấy IP người dùng (để log)
async function getIP() {
    try {
        let res = await fetch('https://api.ipify.org?format=json');
        if (res.ok) { let data = await res.json(); userData.ip = data.ip; }
    } catch (e) { userData.ip = 'Unknown_IP'; }
}

// Tạo 12 bao lì xì
function initGrid() {
    const grid = document.getElementById('gridContainer');
    grid.innerHTML = '';
    
    // Tạo vòng lặp 12 lần
    for (let i = 1; i <= 12; i++) {
        const card = document.createElement('div');
        card.className = 'envelope-card';
        
        // Cấu trúc HTML bên trong mỗi bao (Đã bỏ chữ ở dưới, thêm số ở góc đẹp hơn)
        card.innerHTML = `
            <div class="envelope-num">${i}</div>
            <img src="lixi.png" class="envelope-img" alt="Bao lì xì">`;
        
        // Sự kiện Click
        card.onclick = (e) => handleCardClick(card, e);
        grid.appendChild(card);
    }
}

// Dropdown chọn ngân hàng
function initBankDropdown() {
    const input = document.getElementById('bankInput');
    const list = document.getElementById('bankListDropdown');

    function toggleBankOther(show) {
        const wrap = document.getElementById('bankOtherWrap');
        const otherInput = document.getElementById('bankOtherInput');
        wrap.style.display = show ? 'block' : 'none';
        if (!show) otherInput.value = '';
        else otherInput.focus();
    }

    function renderList(items) {
        list.innerHTML = '';
        if (items.length === 0) { list.style.display = 'none'; return; }
        items.forEach(bankName => {
            const div = document.createElement('div');
            div.className = 'bank-item';
            div.textContent = bankName;
            div.onclick = () => {
                input.value = bankName;
                list.style.display = 'none';
                toggleBankOther(bankName === 'Khác');
            };
            list.appendChild(div);
        });
        list.style.display = 'block';
    }

    input.addEventListener('focus', () => renderList(bankListDB));
    input.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        const filtered = bankListDB.filter(b => b.toLowerCase().includes(val.toLowerCase()));
        renderList(filtered);
        if (val === 'Khác') toggleBankOther(true);
        else toggleBankOther(false);
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !list.contains(e.target)) list.style.display = 'none';
    });
}

// QUY TRÌNH MỞ BAO:
// - PC: Di chuột vào bao -> Rung lắc -> Click mới mở
// - Mobile: Chạm 1 lần -> Rung lắc -> Chạm lần 2 mới mở
function handleCardClick(card, e) {
    if (card.classList.contains('opened')) return;

    if (isTouchDevice) {
        // Điện thoại: Chạm 1 lần = rung lắc, chạm lần 2 = mở form
        if (!card.classList.contains('active-touch')) {
            document.querySelectorAll('.envelope-card').forEach(c => c.classList.remove('active-touch'));
            card.classList.add('active-touch');
            return; // Chưa mở, chỉ rung
        }
    }
    // PC: Click trực tiếp mở (hover đã rung qua CSS)
    // Mobile: Click lần 2 mở (lần 1 đã rung)
    selectedEnvelope = card;
    document.getElementById('infoModal').style.display = 'flex';
}

// Nút Gửi Thông Tin
document.getElementById('submitInfoBtn').onclick = async () => {
    const name = document.getElementById('userName').value.trim();
    const phone = document.getElementById('userPhone').value.trim();
    const bankInputVal = document.getElementById('bankInput').value.trim();
    const bankOther = document.getElementById('bankOtherInput').value.trim();
    const bank = bankInputVal === 'Khác' ? bankOther : bankInputVal;
    const stk = document.getElementById('userStk').value.trim();
    const errorMsg = document.getElementById('formError');

    // Validate
    if (!name || !phone || !stk) {
        errorMsg.innerText = "Vui lòng điền đủ thông tin!"; return;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
        errorMsg.innerText = "Số điện thoại phải đúng 10 số!"; return;
    }
    if (!bank) {
        errorMsg.innerText = bankInputVal === 'Khác' ? "Vui lòng nhập tên ngân hàng!" : "Vui lòng chọn ngân hàng!"; return;
    }
    
    // Gửi dữ liệu
    document.getElementById('infoModal').style.display = 'none';
    document.getElementById('loadingOverlay').style.display = 'flex';

    try {
        const query = new URLSearchParams({
            phone: phoneDigits, name: name, bank: bank, stk: stk, ip: userData.ip
        }).toString();

        const res = await fetch(`${SCRIPT_URL}?${query}`);
        const data = await res.json();
        
        document.getElementById('loadingOverlay').style.display = 'none';

        if (data.status === 'duplicate_stk') {
            showDuplicateModal('stk', { stk, bank });
        } 
        else if (data.status === 'duplicate_phone') {
            showDuplicateModal('phone', { phone });
        } 
        else if (data.status === 'success') {
            // Thành công -> Mở quà
            revealPrize(data.prize);
        } 
        else {
            alert("Lỗi: " + data.message);
            document.getElementById('infoModal').style.display = 'flex';
        }
    } catch (e) {
        document.getElementById('loadingOverlay').style.display = 'none';
        alert("Lỗi kết nối! Vui lòng thử lại.");
        document.getElementById('infoModal').style.display = 'flex';
    }
};

// Ánh xạ số tiền -> ảnh đồng tiền (đặt file 10000.jpg, 20000.jpg, 50000.jpg, 100000.jpg cùng thư mục index.html)
const PRIZE_IMAGES = { 10000: '10000.jpg', 20000: '20000.jpg', 50000: '50000.jpg', 100000: '100000.jpg' };

function revealPrize(amount) {
    if (selectedEnvelope) {
        selectedEnvelope.classList.remove('active-touch');
        selectedEnvelope.classList.add('opened');
    }
    const num = parseInt(amount);
    const imgEl = document.getElementById('prizeImg');
    const textEl = document.getElementById('prizeAmount');
    
    if (PRIZE_IMAGES[num]) {
        imgEl.src = PRIZE_IMAGES[num];
        imgEl.style.display = 'block';
        imgEl.onerror = () => { imgEl.style.display = 'none'; };
    } else {
        imgEl.style.display = 'none';
    }
    textEl.innerText = num.toLocaleString('vi-VN') + ' VNĐ';
    document.getElementById('resultModal').style.display = 'flex';
}

// Sau khi xác nhận thành công: Reset toàn bộ 12 bao như mới cho người khác bốc tiếp
window.finishSession = () => {
    document.getElementById('resultModal').style.display = 'none';
    document.getElementById('prizeImg').src = '';
    
    // Xóa dữ liệu form
    document.getElementById('userName').value = '';
    document.getElementById('userPhone').value = '';
    document.getElementById('userStk').value = '';
    document.getElementById('bankInput').value = '';
    document.getElementById('bankOtherInput').value = '';
    document.getElementById('bankOtherWrap').style.display = 'none';
    document.getElementById('formError').innerText = '';

    // Reset tất cả 12 bao lì xì về trạng thái ban đầu
    selectedEnvelope = null;
    document.querySelectorAll('.envelope-card').forEach(c => {
        c.classList.remove('opened');
        c.classList.remove('active-touch');
    });
};

function showDuplicateModal(type, data) {
    const descEl = document.getElementById('duplicateDesc');
    const stkRow = document.getElementById('dupStkRow');
    const bankRow = document.getElementById('dupBankRow');
    const stkLabel = document.querySelector('#dupStkRow .dup-label');
    
    if (type === 'stk') {
        descEl.textContent = 'Tài khoản ngân hàng này đã nhận lì xì trước đó.';
        stkLabel.textContent = 'Số tài khoản:';
        document.getElementById('dupStk').textContent = data.stk;
        document.getElementById('dupBank').textContent = data.bank;
        stkRow.style.display = 'flex';
        bankRow.style.display = 'flex';
    } else {
        descEl.textContent = 'Số điện thoại này đã được sử dụng để nhận lì xì.';
        stkLabel.textContent = 'Số điện thoại:';
        document.getElementById('dupStk').textContent = data.phone;
        stkRow.style.display = 'flex';
        bankRow.style.display = 'none';
    }
    document.getElementById('duplicateModal').style.display = 'flex';
}

window.closeDuplicateModal = () => {
    document.getElementById('duplicateModal').style.display = 'none';
    document.getElementById('infoModal').style.display = 'flex';
};