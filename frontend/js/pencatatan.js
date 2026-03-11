// Pencatatan Page Functions

// Local storage for pelanggan data - JANGAN shared globally

// Helper: Hitung rincian tarif progresif
function hitungTarifProgresif(pemakaian, kategori, tarifList) {
    if (!tarifList || tarifList.length === 0) {
        return {
            total: 0,
            rincian: [{ range: '0-', m3: pemakaian, tarif: 0, subtotal: 0 }]
        };
    }

    // Filter tarif berdasarkan kategori
    const tarifKategori = tarifList.filter(t => t.kategori === kategori && t.aktif);
    // Sort berdasarkan batas_bawah
    tarifKategori.sort((a, b) => a.batas_bawah - b.batas_bawah);

    let sisaPemakaian = pemakaian;
    let totalBiaya = 0;
    const rincian = [];

    for (const tarif of tarifKategori) {
        if (sisaPemakaian <= 0) break;

        const rangeMin = tarif.batas_bawah;
        const rangeMax = tarif.batas_atas;
        const hargaPerM3 = tarif.harga_per_m3;

        // Hitung berapa m3 yang masuk range ini
        let m3DiRange = 0;

        if (pemakaian <= rangeMax) {
            // Semua pemakaian masuk range ini
            if (pemakaian > rangeMin) {
                m3DiRange = pemakaian - rangeMin;
            }
        } else {
            // Sebagian masuk range ini
            if (sisaPemakaian > 0) {
                m3DiRange = Math.min(sisaPemakaian, rangeMax - rangeMin);
            }
        }

        if (m3DiRange > 0) {
            const subtotal = m3DiRange * hargaPerM3;
            totalBiaya += subtotal;
            rincian.push({
                range: `${rangeMin}-${rangeMax === 999999 ? '+' : rangeMax}`,
                m3: m3DiRange,
                tarif: hargaPerM3,
                subtotal: subtotal
            });
            sisaPemakaian -= m3DiRange;
        }
    }

    return {
        total: totalBiaya,
        rincian: rincian
    };
}

// Helper: Format range tarif untuk display
function formatRangeTarif(rincian) {
    return rincian.map(r => {
        return `${r.m3} m³ × ${Utils.formatCurrency(r.tarif)}`;
    }).join(' + ');
}

// Helper: Get bulan-bulan yang belum tercatat
async function getBulanBelumDicatat(pencatatan, pelanggan = null) {
    if (!pencatatan.jumlah_bulan_belum_dicatat || pencatatan.jumlah_bulan_belum_dicatat <= 1) {
        return null;
    }

    const bulan = pencatatan.bulan;
    const tahun = pencatatan.tahun;
    const jumlahBulan = pencatatan.jumlah_bulan_belum_dicatat - 1; // -1 karena bulan ini sudah dicatat

    if (jumlahBulan <= 0) return null;

    const referensiTanggal = pelanggan?.created_at || pelanggan?.updated_at || null;
    let batasMulaiBulan = 1;
    let batasMulaiTahun = 1900;
    if (referensiTanggal) {
        const tanggalObj = new Date(referensiTanggal);
        if (!Number.isNaN(tanggalObj.getTime())) {
            batasMulaiBulan = tanggalObj.getMonth() + 1;
            batasMulaiTahun = tanggalObj.getFullYear();
        }
    }

    const bulanBelum = [];
    for (let i = 1; i <= jumlahBulan; i++) {
        const bulanSebelumnya = bulan - i;
        let bulanDisplay, tahunDisplay;

        if (bulanSebelumnya <= 0) {
            bulanDisplay = bulanSebelumnya + 12;
            tahunDisplay = tahun - 1;
        } else {
            bulanDisplay = bulanSebelumnya;
            tahunDisplay = tahun;
        }

        if (tahunDisplay < batasMulaiTahun) {
            continue;
        }
        if (tahunDisplay === batasMulaiTahun && bulanDisplay < batasMulaiBulan) {
            continue;
        }

        const namaBulan = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
                           'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][bulanDisplay];
        bulanBelum.push(`${namaBulan} ${tahunDisplay}`);
    }

    return bulanBelum.length > 0 ? bulanBelum : null;
}

async function getInstansiSettings() {
    try {
        return await API.pencatatan.getPengaturanInstansi();
    } catch (error) {
        console.warn('Gagal memuat pengaturan instansi:', error);
        return {
            nama_instansi: 'PAMSIMAS',
            alamat_instansi: '',
            no_telp_instansi: ''
        };
    }
}

const PENCATATAN_PAGE_SIZE = 20;
let pencatatanFilteredList = [];
let pencatatanCurrentPage = 1;

function renderPencatatanPagination() {
    const paginationEl = document.getElementById('pencatatanPagination');
    if (!paginationEl) return;

    const totalData = pencatatanFilteredList.length;
    const totalPages = Math.max(1, Math.ceil(totalData / PENCATATAN_PAGE_SIZE));
    const canPrev = pencatatanCurrentPage > 1;
    const canNext = pencatatanCurrentPage < totalPages;

    paginationEl.innerHTML = `
        <div class="d-flex justify-content-between align-items-center" style="margin-top: 1rem; gap: 0.75rem; flex-wrap: wrap;">
            <small class="text-muted">Halaman ${pencatatanCurrentPage} dari ${totalPages} (${totalData} data)</small>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-secondary btn-sm" onclick="goToPrevPencatatanPage()" ${canPrev ? '' : 'disabled'}>&#11013;&#65039; Sebelumnya</button>
                <button class="btn btn-secondary btn-sm" onclick="goToNextPencatatanPage()" ${canNext ? '' : 'disabled'}>Berikutnya &#10145;&#65039;</button>
            </div>
        </div>
    `;
}

function goToPrevPencatatanPage() {
    if (pencatatanCurrentPage <= 1) return;
    pencatatanCurrentPage -= 1;
    renderPelangganTablePencatatan(pencatatanFilteredList);
    renderPencatatanPagination();
}

function goToNextPencatatanPage() {
    const totalPages = Math.max(1, Math.ceil(pencatatanFilteredList.length / PENCATATAN_PAGE_SIZE));
    if (pencatatanCurrentPage >= totalPages) return;
    pencatatanCurrentPage += 1;
    renderPelangganTablePencatatan(pencatatanFilteredList);
    renderPencatatanPagination();
}

async function resetFilterPelangganPencatatan() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const quickSearchEl = document.getElementById('quickSearch');
    const filterBulanEl = document.getElementById('filterBulan');
    const filterTahunEl = document.getElementById('filterTahun');
    const filterRtEl = document.getElementById('filterRt');
    const filterRwEl = document.getElementById('filterRw');
    const filterStatusEl = document.getElementById('filterStatus');

    if (quickSearchEl) quickSearchEl.value = '';
    if (filterBulanEl) filterBulanEl.value = String(currentMonth);
    if (filterTahunEl) filterTahunEl.value = String(currentYear);
    if (filterRtEl) filterRtEl.value = '';
    if (filterRwEl) filterRwEl.value = '';
    if (filterStatusEl) filterStatusEl.value = '';

    await loadPelangganPencatatan(true);
}

function applyPencatatanPrefill(currentMonth, currentYear) {
    const prefill = window.PagePrefill?.consume?.('pencatatan');
    if (!prefill || typeof prefill !== 'object') return;

    const quickSearchEl = document.getElementById('quickSearch');
    const bulanEl = document.getElementById('filterBulan');
    const tahunEl = document.getElementById('filterTahun');
    const rtEl = document.getElementById('filterRt');
    const rwEl = document.getElementById('filterRw');
    const statusEl = document.getElementById('filterStatus');

    const bulan = String(prefill.bulan || currentMonth);
    const tahun = String(prefill.tahun || currentYear);
    const search = String(prefill.search || '').trim();
    const rt = String(prefill.rt || '').trim();
    const rw = String(prefill.rw || '').trim();
    const status = String(prefill.status || '').trim();

    if (quickSearchEl) quickSearchEl.value = search;
    if (bulanEl) bulanEl.value = bulan;
    if (tahunEl) {
        const yearExists = Array.from(tahunEl.options || []).some((opt) => opt.value === tahun);
        if (!yearExists && /^\d{4}$/.test(tahun)) {
            tahunEl.insertAdjacentHTML('beforeend', `<option value="${tahun}">${tahun}</option>`);
        }
        tahunEl.value = tahun;
    }
    if (rtEl) rtEl.value = rt;
    if (rwEl) rwEl.value = rw;
    if (statusEl) statusEl.value = status;
}

// Render Pencatatan Page
async function renderPencatatanPage() {
    const contentWrapper = document.getElementById('contentWrapper');

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const html = `
        <div class="page-content">
            <div class="page-header">
                <div class="page-title">
                    <h2>Pencatatan Meteran</h2>
                </div>
                <div class="page-actions">
                    <button class="btn btn-primary" onclick="showCatatMeteranModal()">
                        &#128221; Catat Meteran
                    </button>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-body">
                    <div class="filter-bar">
                        <div class="form-group" style="flex: 2;">
                            <label>&#128269; Cari Pelanggan</label>
                            <input type="text" id="quickSearch" class="form-control" placeholder="Masukkan nama atau kode pelanggan">
                            <small class="text-muted">Gunakan Tampilkan Data untuk filter tabel. Gunakan Catat Cepat untuk langsung buka form pencatatan.</small>
                        </div>
                        <div class="form-group">
                            <label>Periode Bulan</label>
                            <select id="filterBulan" class="form-control">
                                ${generateMonthOptions(currentMonth)}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Periode Tahun</label>
                            <select id="filterTahun" class="form-control">
                                <option value="${currentYear}" selected>${currentYear}</option>
                                <option value="${currentYear - 1}">${currentYear - 1}</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>RT</label>
                            <select id="filterRt" class="form-control">
                                <option value="">Semua RT</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>RW</label>
                            <select id="filterRw" class="form-control">
                                <option value="">Semua RW</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Status Pencatatan</label>
                            <select id="filterStatus" class="form-control">
                                <option value="">Semua</option>
                                <option value="belum">Belum Dicatat</option>
                                <option value="sudah">Sudah Dicatat</option>
                            </select>
                        </div>
                        <div class="form-group" style="flex: 0 0 auto; min-width: auto;">
                            <label>&nbsp;</label>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-secondary" onclick="filterPelangganPencatatan()">&#128202; Tampilkan Data</button>
                                <button class="btn btn-primary" onclick="quickSearchPelanggan()">&#9889; Catat Cepat</button>
                                <button class="btn btn-primary" onclick="resetFilterPelangganPencatatan()">&#128260; Reset</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Kode</th>
                                    <th>Pelanggan</th>
                                    <th>Alamat</th>
                                    <th>Periode</th>
                                    <th>Meteran</th>
                                    <th>Status</th>
                                    <th>Pembayaran</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="pencatatanTableBody">
                                <tr>
                                    <td colspan="8" class="text-center">Loading...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div id="pencatatanPagination"></div>
                </div>
            </div>
        </div>
    `;

    contentWrapper.innerHTML = html;

    const quickSearchEl = document.getElementById('quickSearch');
    if (quickSearchEl) {
        quickSearchEl.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                filterPelangganPencatatan();
            }
        });
    }

    applyPencatatanPrefill(currentMonth, currentYear);
    await loadPelangganPencatatan(true);
}
// Generate Month Options
function generateMonthOptions(currentMonth) {
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    return months.map((month, index) => {
        const monthNum = index + 1;
        return `<option value="${monthNum}" ${monthNum === currentMonth ? 'selected' : ''}>${month}</option>`;
    }).join('');
}

function formatPeriodeBulanan(bulan, tahun) {
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const monthIndex = Number(bulan) - 1;
    const monthName = months[monthIndex] || `Bulan ${bulan}`;
    return `${monthName} ${tahun}`;
}

function toPeriodeKey(year, month) {
    return (Number(year) * 12) + Number(month);
}

function getPelangganPeriodePemasanganKey(pelanggan) {
    const rawDate = pelanggan?.created_at || pelanggan?.updated_at;
    if (!rawDate) return null;
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return toPeriodeKey(parsed.getFullYear(), parsed.getMonth() + 1);
}

// Load Pelanggan Data dengan status pencatatan bulan ini
async function loadPelangganPencatatan(resetPage = false) {
    try {
        if (!document.getElementById('pencatatanTableBody')) {
            return;
        }

        const filterBulanEl = document.getElementById('filterBulan');
        const filterTahunEl = document.getElementById('filterTahun');
        const filterRtEl = document.getElementById('filterRt');
        const filterRwEl = document.getElementById('filterRw');
        const filterStatusEl = document.getElementById('filterStatus');
        const quickSearchEl = document.getElementById('quickSearch');

        const now = new Date();
        const bulan = filterBulanEl ? parseInt(filterBulanEl.value, 10) : now.getMonth() + 1;
        const tahun = filterTahunEl ? parseInt(filterTahunEl.value, 10) : now.getFullYear();
        const rt = filterRtEl ? filterRtEl.value : '';
        const rw = filterRwEl ? filterRwEl.value : '';
        const status = filterStatusEl ? filterStatusEl.value : '';
        const search = quickSearchEl ? quickSearchEl.value.trim() : '';

        const params = { limit: 1000 };
        if (search) params.search = search;
        if (rt) params.rt = rt;
        if (rw) params.rw = rw;

        window.pelangganList = await API.pelanggan.list(params);

        const pencatatanParams = { bulan, tahun };
        const pencatatanList = await API.pencatatan.list(pencatatanParams);

        window.pencatatanMap = {};
        pencatatanList.forEach((item) => {
            window.pencatatanMap[item.pelanggan_id] = item;
        });

        const selectedPeriodeKey = toPeriodeKey(tahun, bulan);
        let filteredPelanggan = window.pelangganList.filter((pelanggan) => {
            const pemasanganKey = getPelangganPeriodePemasanganKey(pelanggan);
            if (!pemasanganKey) return true;
            return pemasanganKey <= selectedPeriodeKey;
        });

        if (status === 'sudah') {
            filteredPelanggan = filteredPelanggan.filter((pelanggan) => window.pencatatanMap[pelanggan.id]);
        } else if (status === 'belum') {
            filteredPelanggan = filteredPelanggan.filter((pelanggan) => !window.pencatatanMap[pelanggan.id]);
        }

        if (!Array.isArray(filteredPelanggan)) {
            console.error('API returned unexpected data:', filteredPelanggan);
            window.pelangganList = [];
            filteredPelanggan = [];
        }

        pencatatanFilteredList = filteredPelanggan;
        if (resetPage) {
            pencatatanCurrentPage = 1;
        }

        const totalPages = Math.max(1, Math.ceil(pencatatanFilteredList.length / PENCATATAN_PAGE_SIZE));
        if (pencatatanCurrentPage > totalPages) {
            pencatatanCurrentPage = totalPages;
        }

        renderPelangganTablePencatatan(pencatatanFilteredList);
        renderPencatatanPagination();
        await populateRtRwFiltersPencatatan();
    } catch (error) {
        console.error('Error loading pelanggan:', error);
        Utils.showToast('Gagal memuat data pelanggan: ' + error.message, 'error');
        window.pelangganList = [];
        pencatatanFilteredList = [];
        pencatatanCurrentPage = 1;
        renderPelangganTablePencatatan([]);
        renderPencatatanPagination();
    }
}

// Render Pelanggan Table dengan status pencatatan
function renderPelangganTablePencatatan(pelangganList) {
    const tbody = document.getElementById('pencatatanTableBody');
    if (!tbody) {
        console.warn('Element #pencatatanTableBody tidak ditemukan, skip render tabel pencatatan.');
        return;
    }

    // Cek apakah filter elements ada (untuk menghindari error saat render dari catch block)
    const filterBulanEl = document.getElementById('filterBulan');
    const filterTahunEl = document.getElementById('filterTahun');

    // Jika filter tidak ada, gunakan bulan/tahun sekarang
    const now = new Date();
    const bulan = filterBulanEl ? parseInt(filterBulanEl.value) : now.getMonth() + 1;
    const tahun = filterTahunEl ? parseInt(filterTahunEl.value) : now.getFullYear();
    const isPeriodeBulanIni = (bulan === (now.getMonth() + 1)) && (tahun === now.getFullYear());
    const periodeLabel = formatPeriodeBulanan(bulan, tahun);

    if (!pelangganList || pelangganList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Tidak ada data pelanggan</td></tr>';
        return;
    }

    const startIndex = (pencatatanCurrentPage - 1) * PENCATATAN_PAGE_SIZE;
    const endIndex = startIndex + PENCATATAN_PAGE_SIZE;
    const pagedList = pelangganList.slice(startIndex, endIndex);

    if (!pagedList || pagedList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Tidak ada data pada halaman ini</td></tr>';
        return;
    }

    tbody.innerHTML = pagedList.map((p) => {
        const pencatatan = window.pencatatanMap[p.id];
        const sudahDicatat = !!pencatatan;

        // Format alamat
        const rtRw = [p.rt, p.rw].filter(Boolean).join('/');
        const alamat = p.alamat ? p.alamat.toUpperCase() : '';
        const alamatDisplay = rtRw ? `RT ${rtRw}${alamat ? ', ' + alamat : ''}` : alamat || '-';

        let meteranHtml = '<span class="text-muted">-</span>';
        let statusHtml = '<span class="badge badge-warning">Belum Dicatat</span>';
        let pembayaranHtml = '<span class="text-muted">-</span>';
        let aksiButtons = isPeriodeBulanIni
            ? `<button class="btn btn-sm btn-success" onclick="catatMeteranUntukPelanggan(${p.id})">&#128221; Catat</button>`
            : '<span class="text-muted">-</span>';

        if (sudahDicatat) {
            meteranHtml = `
                <div><small>Awal: ${pencatatan.meteran_awal} m&sup3;</small></div>
                <div><small>Akhir: ${pencatatan.meteran_akhir} m&sup3;</small></div>
                <div><small class="text-primary">Pakai: ${pencatatan.pemakaian} m&sup3;</small></div>
            `;
            statusHtml = '<span class="badge badge-success">Sudah Dicatat</span>';
            pembayaranHtml = pencatatan.pembayaran_id
                ? '<span class="badge badge-success">Lunas</span>'
                : '<span class="badge badge-warning">Belum Bayar</span>';

            const lihatFotoButton = pencatatan.foto_meteran
                ? `<button class="btn btn-sm btn-secondary" onclick="viewFotoMeteran('${pencatatan.foto_meteran}')" title="Lihat Foto">&#128247; Foto</button>`
                : '';

            if (pencatatan.pembayaran_id) {
                // Data lunas: hilangkan tombol edit, sisakan foto + print.
                aksiButtons = `
                    ${lihatFotoButton || '<button class="btn btn-sm btn-secondary" disabled title="Foto tidak tersedia">&#128247; Foto</button>'}
                    <button class="btn btn-sm btn-primary" onclick="showPrintStrukOption(${pencatatan.id})" title="Print Struk">&#128424; Struk</button>
                `;
            } else {
                aksiButtons = `
                    <button class="btn btn-sm btn-primary" onclick="showEditPencatatanModal(${pencatatan.id})" title="Edit">&#9998;&#65039; Edit</button>
                    ${lihatFotoButton}
                    <button class="btn btn-sm btn-success" onclick="prosesPembayaranFromPencatatan(${pencatatan.id})" title="Bayar">&#128176; Bayar</button>
                `;
            }
        }

        return `
            <tr>
                <td><span class="badge badge-primary">${p.kode_pelanggan}</span></td>
                <td>
                    <strong>${p.nama.toUpperCase()}</strong><br>
                    <small class="text-muted">${p.kategori.toUpperCase()}</small>
                </td>
                <td><small>${alamatDisplay}</small></td>
                <td><strong>${periodeLabel}</strong></td>
                <td>${meteranHtml}</td>
                <td>${statusHtml}</td>
                <td>${pembayaranHtml}</td>
                <td>
                    <div class="action-buttons">
                        ${aksiButtons}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Filter Pelanggan
async function filterPelangganPencatatan() {
    await loadPelangganPencatatan(true);
}

// Catat meteran untuk pelanggan tertentu (dari tombol aksi)
function catatMeteranUntukPelanggan(pelangganId) {
    const pelanggan = window.pelangganList.find(p => p.id === pelangganId);
    if (pelanggan) {
        showCatatMeteranModalForPelanggan(pelanggan);
    }
}

// Populate RT/RW Filters
async function populateRtRwFiltersPencatatan() {
    try {
        // Get RT/RW list dari cache atau API
        const { rt: rtValues, rw: rwValues } = await API.getRtRwList();

        // Populate RT filter
        const rtSelect = document.getElementById('filterRt');
        if (rtSelect) {
            const currentRt = rtSelect.value;
            rtSelect.innerHTML = '<option value="">Semua RT</option>' +
                rtValues.map(rt => `<option value="${rt}" ${rt === currentRt ? 'selected' : ''}>RT ${rt}</option>`).join('');
        }

        // Populate RW filter
        const rwSelect = document.getElementById('filterRw');
        if (rwSelect) {
            const currentRw = rwSelect.value;
            rwSelect.innerHTML = '<option value="">Semua RW</option>' +
                rwValues.map(rw => `<option value="${rw}" ${rw === currentRw ? 'selected' : ''}>RW ${rw}</option>`).join('');
        }
    } catch (error) {
        console.error('Error populating RT/RW filters:', error);
    }
}

// Quick Search Pelanggan
async function quickSearchPelanggan() {
    const search = document.getElementById('quickSearch').value.trim();

    if (!search) {
        Utils.showToast('Isi kolom cari dulu untuk Catat Cepat', 'warning');
        return;
    }

    try {
        Utils.showLoading();

        // Langsung search, tidak perlu coba getByKode dulu
        const results = await API.pelanggan.list({ search, limit: 10 });

        if (results.length === 0) {
            Utils.hideLoading();
            Utils.showToast('Pelanggan tidak ditemukan', 'error');
            return;
        }

        if (results.length === 1) {
            Utils.hideLoading();
            showCatatMeteranModalForPelanggan(results[0]);
        } else {
            // Show selection modal
            Utils.hideLoading();
            showPelangganSelectionModal(results);
        }

    } catch (error) {
        Utils.hideLoading();
        Utils.showToast('Gagal mencari pelanggan: ' + error.message, 'error');
    }
}

// Show Pelanggan Selection Modal (untuk quick search)
function showPelangganSelectionModal(results) {
    // Simpan hasil di window object untuk akses mudah
    window._pelangganResults = results;

    const content = `
        <h5 class="mb-3">Ditemukan ${results.length} pelanggan:</h5>
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Kode</th>
                        <th>Nama</th>
                        <th>Alamat</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map((p, index) => {
                        const rtRw = [p.rt, p.rw].filter(Boolean).join('/');
                        const alamat = p.alamat ? p.alamat.toUpperCase() : '';
                        const alamatLengkap = rtRw ? `RT ${rtRw}${alamat ? ', ' + alamat : ''}` : alamat || '-';

                        return `
                            <tr>
                                <td>${p.kode_pelanggan}</td>
                                <td>${p.nama.toUpperCase()}</td>
                                <td>${alamatLengkap}</td>
                                <td>
                                    <button class="btn btn-sm btn-primary" onclick="quickSelectPelanggan(${index})">
                                        &#9989; Pilih
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        <div class="form-group mt-3">
            <button class="btn btn-secondary btn-block" onclick="Utils.hideModal()">&#10060; Tutup</button>
        </div>
    `;

    Utils.showModal('Pilih Pelanggan', content);
}

// Quick Select Pelanggan dari selection modal (menggunakan index)
function quickSelectPelanggan(index) {
    const pelanggan = window._pelangganResults[index];
    delete window._pelangganResults; // Cleanup
    Utils.hideModal();
    showCatatMeteranModalForPelanggan(pelanggan);
}

// Show Catat Meteran Modal
async function showCatatMeteranModal() {
    // For now, show search
    const content = `
        <div class="form-group">
            <label class="required">&#128269; Cari Pelanggan</label>
            <input type="text" id="modalSearchPelanggan" class="form-control" placeholder="Masukkan nama atau kode pelanggan">
        </div>
        <div class="form-group">
            <button class="btn btn-primary btn-block" onclick="searchPelangganInModal()">&#128269; Cari Pelanggan</button>
        </div>
        <div id="pelangganSearchResult"></div>
    `;

    Utils.showModal('Catat Meteran - Cari Pelanggan', content);

    // Setup enter key
    document.getElementById('modalSearchPelanggan').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchPelangganInModal();
        }
    });
}

// Search Pelanggan in Modal
async function searchPelangganInModal() {
    const search = document.getElementById('modalSearchPelanggan').value.trim();
    const resultDiv = document.getElementById('pelangganSearchResult');

    if (!search) {
        Utils.showToast('Masukkan nama atau kode pelanggan', 'warning');
        return;
    }

    try {
        Utils.showLoading();

        // Langsung search, tidak perlu coba getByKode
        const results = await API.pelanggan.list({ search, limit: 10 });
        Utils.hideLoading();

        if (results.length === 0) {
            resultDiv.innerHTML = '<p class="text-danger">Pelanggan tidak ditemukan</p>';
            return;
        }

        if (results.length === 1) {
            selectPelanggan(results[0]);
        } else {
            // Show list dengan menggunakan index-based approach
            window._modalPelangganResults = results;

            resultDiv.innerHTML = `
                <h5 class="mt-3 mb-2">Ditemukan ${results.length} pelanggan:</h5>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Kode</th>
                                <th>Nama</th>
                                <th>Alamat</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${results.map((p, index) => {
                                const rtRw = [p.rt, p.rw].filter(Boolean).join('/');
                                const alamat = p.alamat ? p.alamat.toUpperCase() : '';
                                const alamatLengkap = rtRw ? `RT ${rtRw}${alamat ? ', ' + alamat : ''}` : alamat || '-';

                                return `
                                    <tr>
                                        <td>${p.kode_pelanggan}</td>
                                        <td>${p.nama.toUpperCase()}</td>
                                        <td>${alamatLengkap}</td>
                                        <td>
                                            <button class="btn btn-sm btn-primary" onclick="modalSelectPelanggan(${index})">
                                                &#9989; Pilih
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

    } catch (error) {
        Utils.hideLoading();
        resultDiv.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
    }
}

// Modal Select Pelanggan (menggunakan index)
function modalSelectPelanggan(index) {
    const pelanggan = window._modalPelangganResults[index];
    delete window._modalPelangganResults; // Cleanup
    selectPelanggan(pelanggan);
}

// Select Pelanggan
function selectPelanggan(pelanggan) {
    Utils.hideModal();
    showCatatMeteranModalForPelanggan(pelanggan);
}

function bindFotoPreview(inputId, previewWrapperId, previewImageId) {
    const input = document.getElementById(inputId);
    const wrapper = document.getElementById(previewWrapperId);
    const img = document.getElementById(previewImageId);

    if (!input || !wrapper || !img) return;

    input.addEventListener('change', () => {
        const file = input.files && input.files[0] ? input.files[0] : null;
        if (!file) {
            wrapper.style.display = 'none';
            img.removeAttribute('src');
            return;
        }

        if (!file.type.startsWith('image/')) {
            Utils.showToast('File harus berupa gambar', 'warning');
            input.value = '';
            wrapper.style.display = 'none';
            img.removeAttribute('src');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            wrapper.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });
}

// Show Catat Meteran Modal for Pelanggan
async function showCatatMeteranModalForPelanggan(pelanggan) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const rtRw = [pelanggan.rt, pelanggan.rw].filter(Boolean).join('/');
    const alamat = pelanggan.alamat ? pelanggan.alamat.toUpperCase() : '';
    const alamatLengkap = rtRw ? `RT ${rtRw}${alamat ? ', ' + alamat : ''}` : alamat || '-';

    const meteranAwalInfo = pelanggan.meteran_awal !== undefined && pelanggan.meteran_awal !== null
        ? `Meteran awal saat ini: ${pelanggan.meteran_awal} m&sup3;`
        : 'Meteran awal akan diambil dari riwayat bulan sebelumnya (jika ada).';

    const content = `
        <div class="alert alert-info">
            <strong>&#128100; ${pelanggan.nama.toUpperCase()}</strong> (${pelanggan.kode_pelanggan})<br>
            Kategori: ${pelanggan.kategori.toUpperCase()}<br>
            Alamat: ${alamatLengkap}<br>
            Meteran Awal Tercatat: ${pelanggan.meteran_awal || 0} m&sup3;
        </div>

        <form id="catatMeteranForm" onsubmit="return false;">
            <input type="hidden" name="pelanggan_id" value="${pelanggan.id}">
            <input type="hidden" name="meteran_awal_pelanggan" value="${pelanggan.meteran_awal || 0}">
            <input type="hidden" name="status_catat" value="dicatat">

            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <div class="form-group" style="flex: 1; min-width: 160px;">
                    <label class="required">Periode Bulan</label>
                    <select name="bulan" class="form-control" required>
                        ${generateMonthOptions(currentMonth)}
                    </select>
                </div>
                <div class="form-group" style="flex: 1; min-width: 160px;">
                    <label class="required">Periode Tahun</label>
                    <input type="number" name="tahun" class="form-control" value="${currentYear}" min="2020" max="2100" required>
                </div>
            </div>

            <div class="form-group">
                <label class="required">Meteran Akhir (m&sup3;)</label>
                <input type="number" name="meteran_akhir" class="form-control" min="0" required>
                <small class="text-muted">${meteranAwalInfo}</small>
            </div>

            <div class="form-group">
                <label>Foto Meteran</label>
                <input type="file" id="fotoMeteran" class="form-control" accept="image/*">
                <small class="text-muted">Opsional, bisa diunggah sekarang.</small>
                <div id="fotoMeteranPreviewWrap" style="display:none; margin-top:8px;">
                    <small class="text-muted">Preview:</small><br>
                    <img id="fotoMeteranPreview" alt="Preview Foto Meteran" style="max-width:100%; max-height:220px; border-radius:8px; border:1px solid #ddd; margin-top:4px;">
                </div>
            </div>

            <div class="form-group">
                <label>Keterangan</label>
                <textarea name="keterangan" class="form-control text-uppercase" rows="2" placeholder="Opsional"></textarea>
            </div>
            <div class="form-group">
                <button type="submit" class="btn btn-primary btn-block">&#128190; Simpan Pencatatan</button>
            </div>
        </form>
    `;

    Utils.showModal('Catat Meteran', content);
    document.getElementById('catatMeteranForm').addEventListener('submit', handleCatatMeteran);
    bindFotoPreview('fotoMeteran', 'fotoMeteranPreviewWrap', 'fotoMeteranPreview');
}
// Handle Catat Meteran
async function handleCatatMeteran(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const meteranAwalPelanggan = parseInt(formData.get('meteran_awal_pelanggan')) || 0;

    const data = {
        pelanggan_id: parseInt(formData.get('pelanggan_id')),
        bulan: parseInt(formData.get('bulan')),
        tahun: parseInt(formData.get('tahun')),
        meteran_awal: meteranAwalPelanggan,
        meteran_akhir: parseInt(formData.get('meteran_akhir')),
        keterangan: formData.get('keterangan') || null,
        status_catat: 'dicatat' // Default selalu dicatat
    };

    try {
        Utils.showLoading();

        // Create pencatatan
        const pencatatan = await API.pencatatan.create(data);

        // Upload foto if exists
        const fotoInput = document.getElementById('fotoMeteran');
        if (fotoInput && fotoInput.files && fotoInput.files.length > 0) {
            try {
                const fotoFormData = new FormData();
                fotoFormData.append('file', fotoInput.files[0]);

                const token = Config.getToken();
                const response = await fetch(Config.getApiUrl(`/pencatatan/${pencatatan.id}/upload-foto`), {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: fotoFormData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Gagal upload foto');
                }
            } catch (uploadError) {
                console.warn('Warning: Gagal upload foto:', uploadError.message);
                Utils.showToast('Pencatatan tersimpan, tapi upload foto gagal: ' + uploadError.message, 'warning');
            }
        }

        Utils.hideLoading();
        Utils.hideModal();
        Utils.showToast('Pencatatan berhasil disimpan!', 'success');

        await loadPelangganPencatatan();

    } catch (error) {
        Utils.hideLoading();

        // Tampilkan error yang lebih jelas
        let errorMsg = 'Gagal menyimpan pencatatan';
        if (error.response) {
            const errorData = error.response.data;
            if (typeof errorData === 'string') {
                errorMsg = errorData;
            } else if (errorData.detail) {
                if (Array.isArray(errorData.detail)) {
                    // Jika detail adalah array of errors
                    errorMsg = errorData.detail.map(err => err.msg).join(', ');
                } else {
                    errorMsg = errorData.detail;
                }
            } else if (errorData.message) {
                errorMsg = errorData.message;
            }
        } else if (error.message) {
            errorMsg = error.message;
        }

        Utils.showToast(errorMsg, 'error');
    }
}

// View Foto Meteran
function viewFotoMeteran(filename) {
    const apiBaseUrl = Config.getApiUrl('').replace(/\/api$/, '');
    const cleanFilename = String(filename || '').replace(/^\/+/, '');
    const imageUrl = `${apiBaseUrl}/uploads/foto_meteran/${cleanFilename}`;
    const content = `
        <div class="text-center">
            <img src="${imageUrl}" alt="Foto Meteran" style="max-width: 100%; border-radius: 8px;">
        </div>
    `;
    Utils.showModal('Foto Meteran', content);
}

// Proses Pembayaran from Pencatatan
async function prosesPembayaranFromPencatatan(pencatatanId) {
    try {
        Utils.showLoading();

        const pencatatan = await API.pencatatan.get(pencatatanId);
        const tagihan = await API.pencatatan.getTagihan(pencatatanId);
        const pelanggan = await API.pelanggan.get(pencatatan.pelanggan_id);
        const instansiSettings = await getInstansiSettings();
        const bulanBelumDibayar = Array.isArray(tagihan.bulan_belum_bayar) && tagihan.bulan_belum_bayar.length > 0
            ? tagihan.bulan_belum_bayar
            : await getBulanBelumDicatat(pencatatan, pelanggan);

        Utils.hideLoading();

        const rtRw = [pelanggan.rt, pelanggan.rw].filter(Boolean).join('/');
        const alamat = pelanggan.alamat ? pelanggan.alamat.toUpperCase() : '';
        const alamatLengkap = rtRw ? `RT ${rtRw}${alamat ? ', ' + alamat : ''}` : alamat || '-';

        let rincianTarifHtml = '';
        const rincianTarif = Array.isArray(tagihan.rincian_tarif) ? tagihan.rincian_tarif : [];
        if (rincianTarif.length > 0) {
            rincianTarifHtml = rincianTarif.map((r, index) => `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; font-size: 11px; padding-left: 10px;">
                    <span>Tier ${index + 1}: ${r.range} m3 (${r.m3} m3 x ${Utils.formatCurrency(r.harga_per_m3)}):</span>
                    <span>${Utils.formatCurrency(r.subtotal)}</span>
                </div>
            `).join('');
            rincianTarifHtml += `
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; padding-left: 10px;">
                    <span style="font-weight: bold;">Total Biaya Air:</span>
                    <span style="font-weight: bold;">${Utils.formatCurrency(tagihan.biaya_air || 0)}</span>
                </div>
            `;
        } else {
            rincianTarifHtml = `<div style="margin-bottom: 3px;"><span>Biaya Air (${pencatatan.pemakaian} m3):</span> <span>${Utils.formatCurrency(tagihan.biaya_air || 0)}</span></div>`;
        }

        let abondemenHtml = '';
        if (bulanBelumDibayar && bulanBelumDibayar.length > 0) {
            const jumlahBulanAbondemen = bulanBelumDibayar.length;
            const totalBiayaAdmin = tagihan.biaya_admin || 3000;
            const biayaAdminPerBulan = Math.round(totalBiayaAdmin / Math.max(1, tagihan.jumlah_bulan_belum_dicatat || 1));
            const totalBiayaAbondemen = biayaAdminPerBulan * jumlahBulanAbondemen;

            abondemenHtml = `
                <div style="background: #fff3cd; padding: 8px; margin-bottom: 10px; border-radius: 4px; font-size: 11px; border-left: 4px solid #ffc107;">
                    <strong style="color: #856404;">ABONDEMEN (${jumlahBulanAbondemen} bulan):</strong><br>
                    <div style="color: #856404; margin-top: 3px;">
                        <strong>Bulan belum bayar:</strong><br>
                        <span style="color: #dc3545;">${bulanBelumDibayar.join(', ')}</span><br>
                        <div style="margin-top: 5px; border-top: 1px solid #ffc107; padding-top: 5px;">
                            <div>Biaya Admin ditagihkan: ${Utils.formatCurrency(totalBiayaAdmin)}</div>
                            <div>Estimasi admin per bulan: ${Utils.formatCurrency(biayaAdminPerBulan)}</div>
                            <div>Jika dihitung ${jumlahBulanAbondemen} bulan: ${Utils.formatCurrency(totalBiayaAbondemen)}</div>
                            <div style="margin-top: 3px; font-weight: bold; color: #dc3545;">
                                Tagihan Admin saat ini: ${Utils.formatCurrency(totalBiayaAdmin)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        const content = `
            <div style="font-size: 12px;">
                <div style="text-align: center; margin-bottom: 10px;">
                    <strong>${instansiSettings.nama_instansi || 'PAMSIMAS'}</strong><br>
                    ${instansiSettings.alamat_instansi ? `<small>${instansiSettings.alamat_instansi}</small><br>` : ''}
                    ${instansiSettings.no_telp_instansi ? `<small>Telp: ${instansiSettings.no_telp_instansi}</small>` : ''}
                </div>

                <div style="border: 1px dashed #000; padding: 8px; margin-bottom: 10px;">
                    <strong>PELANGGAN</strong><br>
                    Kode: ${pelanggan.kode_pelanggan}<br>
                    Nama: ${pelanggan.nama.toUpperCase()}<br>
                    Alamat: ${alamatLengkap}
                </div>

                <div style="border: 1px dashed #000; padding: 8px; margin-bottom: 10px;">
                    <strong>PENCATATAN</strong><br>
                    Periode: ${pencatatan.bulan}/${pencatatan.tahun}<br>
                    Meteran Awal: ${pencatatan.meteran_awal} m3<br>
                    Meteran Akhir: ${pencatatan.meteran_akhir} m3<br>
                    <strong>Pemakaian: ${pencatatan.pemakaian} m3</strong>
                </div>

                ${abondemenHtml}

                <div style="border: 1px dashed #000; padding: 8px; margin-bottom: 10px;">
                    <strong>RINCIAN TAGIHAN</strong><br>
                    <div style="margin-top: 5px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                            <span><strong>Biaya Air (${pencatatan.pemakaian} m3):</strong></span>
                            <span><strong>${Utils.formatCurrency(tagihan.biaya_air || 0)}</strong></span>
                        </div>
                        ${rincianTarifHtml}
                        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                            <span>Biaya Admin:</span>
                            <span>${Utils.formatCurrency(tagihan.biaya_admin || 3000)}</span>
                        </div>
                        <div style="border-top: 1px dashed #000; margin-top: 5px; padding-top: 5px;">
                            <div style="display: flex; justify-content: space-between;">
                                <strong>TOTAL:</strong>
                                <strong>${Utils.formatCurrency(tagihan.total_tagihan || 0)}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 10px;">
                    <label><strong>Metode Pembayaran:</strong></label>
                    <select id="metodeBayar" class="form-control">
                        <option value="tunai">Tunai</option>
                        <option value="transfer">Transfer</option>
                    </select>
                </div>

                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-success btn-block" onclick="prosesPembayaran(${pencatatanId})">
                        &#128176; Proses Bayar
                    </button>
                    <button class="btn btn-secondary btn-block" onclick="Utils.hideModal()">
                        &#10060; Batal
                    </button>
                </div>
            </div>
        `;

        Utils.showModal('Konfirmasi Pembayaran', content);
    } catch (error) {
        Utils.hideLoading();
        Utils.showToast('Gagal memproses pembayaran: ' + error.message, 'error');
    }
}
// Proses Pembayaran (dari modal)
async function prosesPembayaran(pencatatanId) {
    try {
        const metodeBayar = document.getElementById('metodeBayar').value;

        Utils.showLoading();
        await API.pembayaran.proses(pencatatanId, metodeBayar);
        Utils.hideLoading();
        Utils.hideModal();
        Utils.showToast('Pembayaran berhasil diproses!', 'success');

        await loadPelangganPencatatan();

        // Tampilkan opsi print struk
        setTimeout(() => {
            showPrintStrukOption(pencatatanId);
        }, 500);

    } catch (error) {
        Utils.hideLoading();
        Utils.showToast('Gagal memproses pembayaran: ' + error.message, 'error');
    }
}

// Show Print Struk Option
async function showPrintStrukOption(pencatatanId) {
    try {
        const pembayaran = await API.pembayaran.getByPencatatan(pencatatanId);

        const content = `
            <div style="text-align: center;">
                <h4>🖨️ Cetak Struk Pembayaran</h4>
                <p>Struk sudah berhasil dibuat. Apakah ingin mencetak struk sekarang?</p>

                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                    <button class="btn btn-primary" onclick="printStrukThermal(${pembayaran.id})">
                        🖨️ Print Thermal (58mm)
                    </button>
                    <button class="btn btn-primary" onclick="printStrukThermal(${pembayaran.id}, '80')">
                        🖨️ Print Thermal (80mm)
                    </button>
                    <button class="btn btn-secondary" onclick="Utils.hideModal()">
                        Tutup
                    </button>
                </div>
            </div>
        `;

        Utils.showModal('Print Struk', content);
    } catch (error) {
        console.error('Error preparing print:', error);
    }
}

// Print Struk Thermal (58mm atau 80mm)
async function printStrukThermal(pembayaranId, ukuran = 58) {
    try {
        Utils.showLoading();

        const pembayaran = await API.pembayaran.get(pembayaranId);
        const pencatatan = await API.pencatatan.get(pembayaran.pencatatan_id);
        const pelanggan = await API.pelanggan.get(pencatatan.pelanggan_id);
        const instansiSettings = await getInstansiSettings();
        let tagihan = null;
        try {
            tagihan = await API.pencatatan.getTagihan(pembayaran.pencatatan_id);
        } catch (e) {
            console.warn('Gagal memuat rincian tagihan saat print, gunakan data pembayaran:', e);
        }

        Utils.hideLoading();

        // Format tanggal
        const tanggalBayar = new Date(pembayaran.tanggal_bayar).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });

        // Format alamat
        const rtRw = [pelanggan.rt, pelanggan.rw].filter(Boolean).join('/');
        const alamat = pelanggan.alamat ? pelanggan.alamat.toUpperCase() : '';
        const alamatLengkap = rtRw ? `RT ${rtRw}${alamat ? ', ' + alamat : ''}` : alamat || '-';

        // Generate perintah print thermal (ESC/POS commands)
        const printCommands = generateThermalPrintCommands({
            ukuran,
            pelanggan,
            pencatatan,
            pembayaran,
            tagihan,
            tanggalBayar,
            alamatLengkap,
            instansiSettings
        });

        // Kirim ke printer via API
        try {
            const response = await fetch(Config.getApiUrl('/print/thermal'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Config.getToken()}`
                },
                body: JSON.stringify({
                    commands: printCommands.split('\n'),
                    ukuran: ukuran,
                    method: 'rawbt'  // Default ke rawbt untuk mobile printing
                })
            });

            if (response.ok) {
                const result = await response.json();

                if (result.success && result.commands_encoded) {
                    // Tampilkan rawbt URL untuk mobile printing
                    showRawbtPrintOption(result.commands_encoded);
                } else {
                    Utils.showToast(result.message || 'Struk berhasil diproses!', 'success');
                    Utils.hideModal();
                }
            } else {
                throw new Error('Gagal mengirim ke printer');
            }
        } catch (printError) {
            // Jika API print tidak tersedia, tampilkan perintah di console
            console.log('=== PERINTAH PRINT THERMAL ===');
            printCommands.split('\n').forEach(cmd => console.log(cmd));
            console.log('=== END PERINTAH ===');

            // Tampilkan di modal untuk copy-paste
            showPrintCommands(printCommands);
        }

    } catch (error) {
        Utils.hideLoading();
        Utils.showToast('Gagal menyiapkan print: ' + error.message, 'error');
    }
}

function formatRupiahPrint(value) {
    return Utils.formatCurrency(value || 0).replace(/\s+/g, ' ').trim();
}

function buildReceiptLine(left, right, width) {
    const l = String(left || '');
    const r = String(right || '');
    const maxLeft = Math.max(1, width - r.length - 1);
    const leftTrimmed = l.length > maxLeft ? l.slice(0, maxLeft) : l;
    const spaces = ' '.repeat(Math.max(1, width - leftTrimmed.length - r.length));
    return `${leftTrimmed}${spaces}${r}`;
}

function wrapReceiptText(text, width, indent = '') {
    const words = String(text || '').split(' ').filter(Boolean);
    if (words.length === 0) return [];

    const lines = [];
    let current = indent;
    words.forEach(word => {
        const candidate = current.trim().length === 0 ? `${indent}${word}` : `${current} ${word}`;
        if (candidate.length > width && current.trim().length > 0) {
            lines.push(current);
            current = `${indent}${word}`;
        } else {
            current = candidate;
        }
    });
    if (current.trim().length > 0) {
        lines.push(current);
    }
    return lines;
}

// Generate perintah print thermal (ESC/POS commands)
function generateThermalPrintCommands({ ukuran, pelanggan, pencatatan, pembayaran, tagihan, tanggalBayar, alamatLengkap, instansiSettings }) {
    const charWidth = Number(ukuran) === 58 ? 32 : 48;
    const namaInstansi = instansiSettings?.nama_instansi || 'PAMSIMAS';
    const alamatInstansi = instansiSettings?.alamat_instansi || '';
    const noTelpInstansi = instansiSettings?.no_telp_instansi || '';

    const lineSep = '-'.repeat(charWidth);
    const lineBold = '='.repeat(charWidth);
    const commands = [];

    const rincianTarif = Array.isArray(tagihan?.rincian_tarif) ? tagihan.rincian_tarif : [];
    const bulanBelumBayar = Array.isArray(tagihan?.bulan_belum_bayar) ? tagihan.bulan_belum_bayar : [];
    const jumlahBulanAdmin = Math.max(
        1,
        tagihan?.jumlah_bulan_belum_dicatat || pencatatan?.jumlah_bulan_belum_dicatat || 1
    );

    const biayaAir = pembayaran.biaya_air ?? tagihan?.biaya_air ?? 0;
    const biayaAdmin = pembayaran.biaya_admin ?? tagihan?.biaya_admin ?? 0;
    const totalTagihan = pembayaran.total_tagihan ?? tagihan?.total_tagihan ?? (biayaAir + biayaAdmin);
    const adminPerBulan = jumlahBulanAdmin > 0 ? Math.round(biayaAdmin / jumlahBulanAdmin) : biayaAdmin;

    commands.push('\x1B@');
    commands.push('\x1Ba\x01');
    commands.push('\x1B!');
    commands.push(namaInstansi);
    commands.push('\x1B!\x00');
    if (alamatInstansi) commands.push(alamatInstansi);
    if (noTelpInstansi) commands.push(`Telp: ${noTelpInstansi}`);
    commands.push(lineBold);

    commands.push('\x1Ba\x00');
    commands.push(buildReceiptLine('NOTA PEMBAYARAN', `#${pembayaran.id}`, charWidth));
    commands.push(buildReceiptLine('Tanggal', tanggalBayar, charWidth));
    commands.push(lineSep);

    commands.push(`Kode    : ${pelanggan.kode_pelanggan}`);
    commands.push(`Nama    : ${String(pelanggan.nama || '').toUpperCase()}`);
    wrapReceiptText(`Alamat  : ${alamatLengkap}`, charWidth).forEach((ln) => commands.push(ln));
    commands.push(buildReceiptLine('Periode', `${pencatatan.bulan}/${pencatatan.tahun}`, charWidth));
    commands.push(buildReceiptLine('Meter', `${pencatatan.meteran_awal}-${pencatatan.meteran_akhir}`, charWidth));
    commands.push(buildReceiptLine('Pemakaian', `${pencatatan.pemakaian} m3`, charWidth));
    commands.push(lineSep);

    commands.push('RINCIAN PEMAKAIAN AIR');
    if (rincianTarif.length > 0) {
        rincianTarif.forEach((r) => {
            const label = `${r.range} ${r.m3}m3 x ${formatRupiahPrint(r.harga_per_m3)}`;
            commands.push(buildReceiptLine(label, formatRupiahPrint(r.subtotal), charWidth));
        });
    } else {
        commands.push(buildReceiptLine(`${pencatatan.pemakaian}m3`, formatRupiahPrint(biayaAir), charWidth));
    }
    commands.push(buildReceiptLine('Subtotal Air', formatRupiahPrint(biayaAir), charWidth));

    commands.push(lineSep);
    commands.push('ADMIN / ABONDEMEN');
    commands.push(buildReceiptLine(`Admin x ${jumlahBulanAdmin} bln`, formatRupiahPrint(biayaAdmin), charWidth));
    commands.push(buildReceiptLine('Estimasi / bln', formatRupiahPrint(adminPerBulan), charWidth));
    if (bulanBelumBayar.length > 0) {
        commands.push('Bulan belum bayar:');
        wrapReceiptText(bulanBelumBayar.join(', '), charWidth, '  ').forEach((ln) => commands.push(ln));
    }

    commands.push(lineBold);
    commands.push('\x1B!\x01');
    commands.push(buildReceiptLine('TOTAL BAYAR', formatRupiahPrint(totalTagihan), charWidth));
    commands.push('\x1B!\x00');
    commands.push(lineSep);
    commands.push(buildReceiptLine('Metode', String(pembayaran.metode_bayar || '').toUpperCase(), charWidth));
    commands.push(buildReceiptLine('Status', 'LUNAS', charWidth));
    commands.push(lineBold);
    commands.push('\x1Ba\x01');
    commands.push('TERIMA KASIH');
    commands.push('\x1B!\x00');
    commands.push('\x1D\x56\x00');

    return commands.join('\n') + '\n\n';
}

// Show Print Commands in Modal (untuk copy-paste)
function showPrintCommands(commands) {
    const content = `
        <div>
            <h5>📋 Perintah Print Thermal</h5>
            <p>Copy perintah di bawah dan kirim ke printer:</p>
            <textarea id="printCommands" class="form-control" rows="10" readonly>${commands}</textarea>
            <div class="form-group mt-3" style="display: flex; gap: 10px;">
                <button class="btn btn-primary" onclick="copyPrintCommands()">📋 Copy</button>
                <button class="btn btn-secondary" onclick="Utils.hideModal()">&#10060; Tutup</button>
            </div>
        </div>
    `;

    Utils.showModal('Perintah Print', content);
}

// Copy Print Commands
function copyPrintCommands() {
    const textarea = document.getElementById('printCommands');
    textarea.select();
    document.execCommand('copy');
    Utils.showToast('Perintah berhasil di-copy!', 'success');
}

// Show Rawbt Print Option dengan Preview
function showRawbtPrintOption(encodedCommands) {
    // Decode commands untuk preview
    const commandsText = atob(encodedCommands);
    const receiptLines = commandsText.split('\n').filter(line => line.trim());

    // Generate preview HTML
    const previewContent = generateReceiptPreview(receiptLines);

    const rawbtUrl = `rawbt://print?data=${encodedCommands}`;

    const content = `
        <div>
            <h5>📱 Print via Rawbt App</h5>
            <p>Gunakan rawbt app di Android untuk print struk ini:</p>

            <div class="mb-3" style="background: #f0f8ff; padding: 15px; border-radius: 8px; text-align: center;">
                <p class="mb-2"><strong>Opsi 1: Direct Link</strong></p>
                <a href="${rawbtUrl}" class="btn btn-primary" style="text-decoration: none;">
                    🖨️ Buka Rawbt App
                </a>
            </div>

            <div class="mb-3" style="background: #fff8dc; padding: 15px; border-radius: 8px;">
                <p class="mb-2"><strong>Opsi 2: Preview Struk</strong></p>
                <div id="receiptPreview" style="
                    background: white;
                    border: 2px solid #333;
                    border-radius: 8px;
                    padding: 15px;
                    font-family: 'Courier New', monospace;
                    font-size: 11px;
                    line-height: 1.4;
                    max-height: 300px;
                    overflow-y: auto;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                ">${previewContent}</div>
            </div>

            <div class="mb-3">
                <label><strong>Opsi 3: Copy URL</strong></label>
                <div style="display: flex; gap: 5px;">
                    <input type="text" class="form-control" value="${rawbtUrl}" readonly id="rawbtUrl">
                    <button class="btn btn-secondary" onclick="copyRawbtUrl()">📋 Copy</button>
                </div>
            </div>

            <div class="form-group" style="display: flex; gap: 10px; justify-content: center;">
                <button class="btn btn-secondary" onclick="Utils.hideModal()">&#10060; Tutup</button>
            </div>
        </div>
    `;

    Utils.showModal('Print Struk', content);
}

// Generate Preview Struk dari commands
function generateReceiptPreview(lines) {
    let preview = '';

    // Clean lines dan tampilkan dengan formatting yang lebih baik
    lines.forEach(line => {
        // Skip escape sequences (ESC/POS commands)
        const cleanLine = line.replace(/[\x1B\x1D][@\x00-\xFF]/g, '');

        // Tambahkan styling berdasarkan konten
        if (cleanLine.includes('=')) {
            // Separator lines
            preview += `<div style="text-align: center; border-bottom: 1px dashed #333; margin: 5px 0;">${cleanLine.replace(/=/g, '─')}</div>`;
        } else if (cleanLine.includes('-')) {
            // Separator lines
            preview += `<div style="text-align: center; border-bottom: 1px dotted #999; margin: 5px 0;">${cleanLine.replace(/-/g, '─')}</div>`;
        } else if (cleanLine.match(/NOTA PEMBAYARAN|RINCIAN|TOTAL BAYAR|TERIMA KASIH/)) {
            // Headers
            preview += `<div style="text-align: center; font-weight: bold; margin: 8px 0;">${cleanLine}</div>`;
        } else if (cleanLine.match(/Rp \d+|TOTAL|LUNAS/)) {
            // Price/bold items
            preview += `<div style="font-weight: bold;">${cleanLine}</div>`;
        } else {
            // Regular text
            preview += `<div>${cleanLine}</div>`;
        }
    });

    return preview;
}

// Copy Rawbt URL
function copyRawbtUrl() {
    const input = document.getElementById('rawbtUrl');
    input.select();
    document.execCommand('copy');
    Utils.showToast('Rawbt URL berhasil di-copy!', 'success');
}

// Show Edit Pencatatan Modal
async function showEditPencatatanModal(id) {
    try {
        const pencatatan = await API.pencatatan.get(id);
        const pelanggan = await API.pelanggan.get(pencatatan.pelanggan_id);

        const rtRw = [pelanggan.rt, pelanggan.rw].filter(Boolean).join('/');
        const alamat = pelanggan.alamat ? pelanggan.alamat.toUpperCase() : '';
        const alamatLengkap = rtRw ? `RT ${rtRw}${alamat ? ', ' + alamat : ''}` : alamat || '-';
        const periodeLabel = formatPeriodeBulanan(pencatatan.bulan, pencatatan.tahun);

        const content = `
            <div class="alert alert-info">
                <strong>&#128100; ${pelanggan.nama.toUpperCase()}</strong> (${pelanggan.kode_pelanggan})<br>
                Kategori: ${pelanggan.kategori.toUpperCase()}<br>
                Alamat: ${alamatLengkap}<br>
                No. HP: ${pelanggan.no_hp || '-'}
            </div>

            <div class="alert alert-warning" style="margin-top: 0.75rem;">
                <strong>&#128221; Data Pencatatan</strong><br>
                Periode: ${periodeLabel}<br>
                Meteran Awal: ${pencatatan.meteran_awal} m&sup3;<br>
                Meteran Akhir: ${pencatatan.meteran_akhir} m&sup3;<br>
                Pemakaian: <strong>${pencatatan.pemakaian} m&sup3;</strong>
            </div>

            <form id="editPencatatanForm" onsubmit="return false;">
                <input type="hidden" name="meteran_awal" value="${pencatatan.meteran_awal}">
                <input type="hidden" name="bulan" value="${pencatatan.bulan}">
                <input type="hidden" name="tahun" value="${pencatatan.tahun}">
                <input type="hidden" name="pelanggan_id" value="${pencatatan.pelanggan_id}">

                <div class="form-group">
                    <label class="required">Meteran Akhir (m&sup3;)</label>
                    <input type="number" name="meteran_akhir" class="form-control" value="${pencatatan.meteran_akhir}" min="${pencatatan.meteran_awal}" required>
                    <small class="text-muted">Pemakaian dihitung otomatis dari meteran awal dan akhir.</small>
                </div>

                <div class="form-group">
                    <label>Foto Meteran</label>
                    ${pencatatan.foto_meteran ? `<p style="margin-bottom: 0.5rem;"><a href="#" onclick="viewFotoMeteran('${pencatatan.foto_meteran}'); return false;">&#128247; Lihat Foto Saat Ini</a></p>` : '<small class="text-muted">Belum ada foto meteran.</small>'}
                    <input type="file" id="editFotoMeteran" class="form-control" accept="image/*">
                    <small class="text-muted">Kosongkan jika tidak ingin mengubah foto.</small>
                    <div id="editFotoMeteranPreviewWrap" style="display:none; margin-top:8px;">
                        <small class="text-muted">Preview foto baru:</small><br>
                        <img id="editFotoMeteranPreview" alt="Preview Foto Meteran Baru" style="max-width:100%; max-height:220px; border-radius:8px; border:1px solid #ddd; margin-top:4px;">
                    </div>
                </div>

                <div class="form-group">
                    <label>Keterangan</label>
                    <textarea name="keterangan" class="form-control text-uppercase" rows="2" placeholder="Opsional">${pencatatan.keterangan || ''}</textarea>
                </div>

                <div class="form-group">
                    <button type="submit" class="btn btn-primary btn-block">&#128190; Update Pencatatan</button>
                </div>
            </form>
        `;

        Utils.showModal('Edit Pencatatan', content);
        document.getElementById('editPencatatanForm').addEventListener('submit', (e) => handleEditPencatatan(e, id));
        bindFotoPreview('editFotoMeteran', 'editFotoMeteranPreviewWrap', 'editFotoMeteranPreview');
    } catch (error) {
        Utils.showToast('Gagal memuat data pencatatan: ' + error.message, 'error');
    }
}
// Handle Edit Pencatatan
async function handleEditPencatatan(e, id) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const data = {
        meteran_awal: parseInt(formData.get('meteran_awal')),
        meteran_akhir: parseInt(formData.get('meteran_akhir')),
        keterangan: formData.get('keterangan') || null
    };

    try {
        Utils.showLoading();

        // Update pencatatan
        await API.pencatatan.update(id, data);

        // Upload new foto if exists
        const fotoInput = document.getElementById('editFotoMeteran');
        if (fotoInput && fotoInput.files && fotoInput.files.length > 0) {
            try {
                const fotoFormData = new FormData();
                fotoFormData.append('file', fotoInput.files[0]);

                const token = Config.getToken();
                const response = await fetch(Config.getApiUrl(`/pencatatan/${id}/upload-foto`), {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: fotoFormData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Gagal upload foto');
                }
            } catch (uploadError) {
                console.warn('Warning: Gagal upload foto:', uploadError.message);
                Utils.showToast('Update tersimpan, tapi upload foto gagal: ' + uploadError.message, 'warning');
            }
        }

        Utils.hideLoading();
        Utils.hideModal();
        Utils.showToast('Pencatatan berhasil diupdate!', 'success');

        if (document.getElementById('pencatatanTableBody')) {
            await loadPelangganPencatatan();
        } else if (typeof showPage === 'function') {
            showPage('pencatatan');
        }

    } catch (error) {
        Utils.hideLoading();

        // Tampilkan error yang lebih jelas
        let errorMsg = 'Gagal update pencatatan';
        if (error.response) {
            const errorData = error.response.data;
            if (typeof errorData === 'string') {
                errorMsg = errorData;
            } else if (errorData.detail) {
                if (Array.isArray(errorData.detail)) {
                    errorMsg = errorData.detail.map(err => err.msg).join(', ');
                } else {
                    errorMsg = errorData.detail;
                }
            } else if (errorData.message) {
                errorMsg = errorData.message;
            }
        } else if (error.message) {
            errorMsg = error.message;
        }

        Utils.showToast(errorMsg, 'error');
    }
}





