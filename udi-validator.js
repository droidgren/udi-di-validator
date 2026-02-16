// Info Content Dictionary
const infoContent = {
    'GS1': `
        
        <strong>Standard:</strong> GS1 General Specifications<br>
        <strong>Issuer:</strong> <a href="https://www.gs1.org" target="_blank">GS1 AISBL</a><br><br>
        GS1 UDI-DIs are 14-digit numeric codes (GTIN-14).<br>
        Shorter GTINs (GTIN-8, GTIN-12, GTIN-13) must be padded with leading zeros to form 14 digits.<br><br>
        On the barcode, the UDI-DI is identified by the Application Identifier <strong>(01)</strong>.<br><br>
		Example<br> <code>(01)<b><u>00614141007349</u></b>(17)141231(10)A12345B(21)1234</code><br><br>
        <strong>Validation Method:</strong> Modulo 10.<br>
        1. Multiply digits by 3 and 1 alternately (from right).<br>
        2. Sum the results.<br>
        3. Subtract the sum from next multiple of 10.
    `,
    'HIBCC': `
        
        <strong>Standard:</strong> Health Industry Bar Code (HIBC)<br>
        <strong>Issuer:</strong> <a href="https://www.hibcc.org" target="_blank">Health Industry Business Communications Council (HIBCC)</a><br><br>
        HIBCC UDI-DIs begin with a <code>+</code> character (the LIC flag).<br><br>
        <strong>Structure:</strong> <code>+LIC + Product ID + CheckChar</code><br><br>
		<b>If</b> the code contains a combined  Primary PI (Product Identifier) and a Secondary (DI), eg has a /$ - enter the <b>full</b> code to verify.
		Its not possible to verify only the PI without the DI. 

		Example<br><code>+EZIEZIEHMSOLOFDA11/$+56193/16D20250625W</code>
		<br><br>
        <strong>Validation Method:</strong> Modulo 43.<br>
        1. Assign values to all characters (0-9, A-Z, -, ., Space, $, /, +, %).<br>
        2. Sum values of all characters including the leading <code>+</code>.<br>
        3. <code>Sum % 43</code> gives the index of the Check Character.
		<br><br>
		For more info and details check this <a href="https://health.ec.europa.eu/system/files/2021-01/application_hibcc_en_0.pdf">PDF.</a>
		
    `,
    'ICCBBA': `
        
        <strong>Standard:</strong> ISBT 128<br>
        <strong>Issuer:</strong> <a href="https://www.iccbba.org" target="_blank">International Council for Commonality in Blood Banking Automation (ICCBBA)</a><br><br>
        The ICCBBA UDI-DI (Processor Product Identification Code) typically starts with <code>=/</code>.<br><br>
        <strong>Structure (Data Structure 034):</strong><br>
        <code>=/</code> (Prefix)<br>
        <code>nnnnn</code> (5-char Facility ID)<br>
        <code>pppppp</code> (6-char Product Code)<br>
        <code>qqqqq</code> (5-char Product Description Code)<br><br>
        <strong>Validation:</strong> Checks specific character sets for each section. This structure does <em>not</em> contain an embedded check character for the DI itself.
		<br><br>
		For a Excel based validator, check this <a href="https://iccbba.org/resources/device-id-checker/">link</a>
    `,
    'Unknown': `
        <strong>Unknown Format</strong><br><br>
        The input did not match the standard patterns for the currently supported issuers:
        <ul>
            <li><a href="https://www.gs1.org" target="_blank">GS1</a> (Numeric)</li>
            <li><a href="https://www.hibcc.org" target="_blank">HIBCC</a> (Starts with +)</li>
            <li><a href="https://www.iccbba.org" target="_blank">ICCBBA</a> (Starts with =/)</li>
        </ul>
    `
};

function setInput(val) {
    document.getElementById('udiInput').value = val;
    detectAndValidate();
}

function showInfo(standard) {
    const content = infoContent[standard] || infoContent['Unknown'];
    document.getElementById('modalTitle').innerText = standard + ' Information';
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('infoModal').style.display = 'flex';
}

function closeModal(e) {
    if (e.target === document.getElementById('infoModal') || e.target.className === 'modal-close') {
        document.getElementById('infoModal').style.display = 'none';
    }
}

function detectAndValidate() {
    let input = document.getElementById('udiInput').value.trim();
    const resultDiv = document.getElementById('result');
    resultDiv.style.display = 'none';
    resultDiv.innerHTML = '';

    if (!input) return;

    let result = null;

    // --- 1. ICCBBA UDI-DI (Starts with =/ or &/) ---
    if (input.startsWith('=/') || input.startsWith('&/')) {
        result = validateICCBBA_UDIDI(input);
        showResult(result);
        return;
    }

    // --- 2. HIBCC (Starts with +) ---
    if (input.startsWith('+')) {
        result = validateHIBCC(input);
        showResult(result);
        return;
    }

    // --- 3. Numeric (GS1) ---
    if (/^\d+$/.test(input)) {
        // Try GS1
        const gs1 = validateGS1(input);
        if (gs1.valid) {
            showResult(gs1);
        } else {
            // Show result even if invalid (e.g. wrong length) so the user sees the specific GS1 error
            showResult(gs1);
        }
        return;
    }

    showResult({ valid: false, title: 'Unknown Format', msg: 'Could not detect standard (GS1, HIBCC, ICCBBA).', standard: 'Unknown' });
}

/**
 * HIBCC Validator
 */
function validateHIBCC(code) {
    const charSet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";
    
    const checkChar = code.slice(-1);
    const data = code.slice(0, -1);
    
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data[i];
        const idx = charSet.indexOf(char);
        
        if (idx === -1) {
            return { valid: false, title: 'Invalid Character', msg: `Character '${char}' is not allowed.`, standard: 'HIBCC' };
        }
        sum += idx;
    }
    
    const remainder = sum % 43;
    const calculatedChar = charSet[remainder];

    if (calculatedChar === checkChar) {
        return { valid: true, title: 'Valid HIBCC UDI', msg: `Checksum matches (Mod 43).`, standard: 'HIBCC' };
    } else {
        return { valid: false, title: 'Invalid HIBCC Checksum', msg: `Expected '${calculatedChar}', found '${checkChar}'.`, standard: 'HIBCC' };
    }
}

/**
 * ICCBBA UDI-DI (Structure 034)
 */
function validateICCBBA_UDIDI(code) {
    if (!code.startsWith('=/')) return { valid: false, title: 'Invalid Prefix', msg: 'Must start with =/', standard: 'ICCBBA' };
    if (code.length !== 18) return { valid: false, title: 'Invalid Length', msg: `Expected 18 chars.`, standard: 'ICCBBA' };

    const n = code.substr(2, 5); // Facility
    const p = code.substr(7, 6); // Product
    const q = code.substr(13, 5); // Desc

    if (!/^[A-NP-Z0-9]{5}$/.test(n)) return { valid: false, title: 'Invalid Facility ID', msg: 'Contains invalid chars (e.g. letter O).', standard: 'ICCBBA' };
    if (!/^[A-Z0-9]{6}$/.test(p)) return { valid: false, title: 'Invalid Product Code', msg: 'Invalid chars in product code.', standard: 'ICCBBA' };
    if (!/^[A-Z0-9]{5}$/.test(q)) return { valid: false, title: 'Invalid Desc Code', msg: 'Invalid chars in desc code.', standard: 'ICCBBA' };

    return { valid: true, title: 'Valid UDI-DI', msg: 'Format matches ISBT 128 Data Structure 034.', standard: 'ICCBBA' };
}

/**
 * GS1 (Mod 10)
 */
function validateGS1(code) {
    // STRICT 14-DIGIT CHECK
    if (code.length !== 14) {
        return { 
            valid: false, 
            title: 'Invalid Length', 
            msg: `GS1 UDI-DI must be exactly 14 digits. Found ${code.length}.<br>Shorter GTINs (e.g. GTIN-13) must be padded with leading zeros.`, 
            standard: 'GS1' 
        };
    }
    
    const data = code.slice(0, -1);
    const check = parseInt(code.slice(-1));
    const rev = data.split('').reverse().join('');
    let sum = 0;
    for (let i = 0; i < rev.length; i++) sum += parseInt(rev[i]) * ((i % 2 === 0) ? 3 : 1);
    const calc = (10 - (sum % 10)) % 10;
    
    if (calc === check) {
        return { valid: true, title: 'Valid GS1 GTIN', msg: 'Checksum matches (Mod 10).', standard: 'GS1' };
    } else {
        return { valid: false, title: 'Invalid GS1 Checksum', msg: `Expected ${calc}, found ${check}.`, standard: 'GS1' };
    }
}

function showResult(res) {
    const div = document.getElementById('result');
    div.style.display = 'block';
    div.innerHTML = `
        <div class="result-card ${res.valid ? 'valid' : 'invalid'}">
            <div class="result-header">
                ${res.title}
                <span class="standard-badge">${res.standard}</span>
            </div>
            <div class="result-details">${res.msg}</div>
            <button class="info-btn" onclick="showInfo('${res.standard}')">
                &#9432; About ${res.standard} Structure
            </button>
        </div>
    `;
}