// Pembayaran Page Functions

const PEMBAYARAN_PAGE_SIZE = 20;

let pembayaranCurrentFilters = {
    bulan: String(new Date().getMonth() + 1),
    tahun: String(new Date().getFullYear()),
    rt: '',
    rw: '',
    status: ''
};
let pembayaranCurrentPage = 1;
let pembayaranHasNextPage = false;
let pembayaranCurrentList = [];

function sanitizePembayaranText(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function getPembayaranFiltersFromForm() {
    return {
        bulan: sanitizePembayaranText(document.getElementById('filterBulan')?.value),
        tahun: sanitizePembayaranText(document.getElementById('filterTahun')?.value),
        rt: sanitizePembayaranText(document.getElementById('filterRt')?.value),
        rw: sanitizePembayaranText(document.getElementById('filterRw')?.value),
        status: sanitizePembayaranText(document.getElementById('filterStatus')?.value)
    };
}

function setPembayaranFiltersToForm(filters) {
    const bulanEl = document.getElementById('filterBulan');
    const tahunEl = document.getElementById('filterTahun');
    const rtEl = document.getElementById('filterRt');
    const rwEl = document.getElementById('filterRw');
    const statusEl = document.getElementById('filterStatus');

    if (bulanEl) bulanEl.value = filters.bulan || '';
    if (tahunEl) tahunEl.value = filters.tahun || '';
    if (rtEl) rtEl.value = filters.rt || '';
    if (rwEl) rwEl.value = filters.rw || '';
    if (statusEl) statusEl.value = filters.status || '';

    if (tahunEl && filters.tahun) {
        const normalizedYear = String(filters.tahun);
        const yearExists = Array.from(tahunEl.options || []).some((opt) => opt.value === normalizedYear);
        if (!yearExists && /^\d{4}$/.test(normalizedYear)) {
            tahunEl.insertAdjacentHTML('beforeend', `<option value="${normalizedYear}">${normalizedYear}</option>`);
        }
        tahunEl.value = normalizedYear;
    }
}

function getPembayaranPrefillFilters(defaultFilters) {
    const prefill = window.PagePrefill?.consume?.('pembayaran');
    if (!prefill || typeof prefill !== 'object') return defaultFilters;

    return {
        bulan: sanitizePembayaranText(prefill.bulan) || defaultFilters.bulan,
        tahun: sanitizePembayaranText(prefill.tahun) || defaultFilters.tahun,
        rt: sanitizePembayaranText(prefill.rt),
        rw: sanitizePembayaranText(prefill.rw),
        status: sanitizePembayaranText(prefill.status)
    };
}

function renderPembayaranPagination() {
    const container = document.getElementById('pembayaranPagination');
    if (!container) return;

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center" style="margin-top: 1rem; gap: 0.75rem; flex-wrap: wrap;">
            <small class="text-muted">Halaman ${pembayaranCurrentPage}</small>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-secondary btn-sm" onclick="goToPrevPembayaranPage()" ${pembayaranCurrentPage <= 1 ? 'disabled' : ''}>&#11013;&#65039; Sebelumnya</button>
                <button class="btn btn-secondary btn-sm" onclick="goToNextPembayaranPage()" ${!pembayaranHasNextPage ? 'disabled' : ''}>Berikutnya &#10145;&#65039;</button>
            </div>
        </div>
    `;
}

async function goToPrevPembayaranPage() {
    if (pembayaranCurrentPage <= 1) return;
    await loadPembayaran(pembayaranCurrentFilters, pembayaranCurrentPage - 1);
}

async function goToNextPembayaranPage() {
    if (!pembayaranHasNextPage) return;
    await loadPembayaran(pembayaranCurrentFilters, pembayaranCurrentPage + 1);
}

// Render Pembayaran Page
async function renderPembayaranPage() {
    const contentWrapper = document.getElementById('contentWrapper');
    const now = new Date();
    const currentYear = now.getFullYear();

    const html = `
        <div class="page-content">
            <div class="page-header">
                <div class="page-title">
                    <h2>Pembayaran</h2>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-body">
                    <div class="filter-bar">
                        <div class="form-group">
                            <label>Periode Bulan</label>
                            <select id="filterBulan" class="form-control">
                                <option value="">Semua Bulan</option>
                                ${generateMonthOptions(now.getMonth() + 1)}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Periode Tahun</label>
                            <select id="filterTahun" class="form-control">
                                <option value="">Semua Tahun</option>
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
                            <label>Status</label>
                            <select id="filterStatus" class="form-control">
                                <option value="">Semua Status</option>
                                <option value="lunas">Lunas</option>
                                <option value="belum">Belum</option>
                            </select>
                        </div>
                        <div class="form-group" style="flex: 0 0 auto; min-width: auto;">
                            <label>&nbsp;</label>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-secondary" onclick="filterPembayaran()">&#128202; Tampilkan Data</button>
                                <button class="btn btn-primary" onclick="resetFilterPembayaran()">&#128260; Reset</button>
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
                                    <th>Pelanggan</th>
                                    <th>Periode & Meter</th>
                                    <th>Rincian Tagihan</th>
                                    <th>Status Bayar</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="pembayaranTableBody">
                                <tr><td colspan="5" class="text-center">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div id="pembayaranPagination"></div>
                </div>
            </div>
        </div>
    `;

    contentWrapper.innerHTML = html;

    const defaultFilters = {
        bulan: String(now.getMonth() + 1),
        tahun: String(currentYear),
        rt: '',
        rw: '',
        status: ''
    };
    pembayaranCurrentFilters = getPembayaranPrefillFilters(defaultFilters);
    pembayaranCurrentPage = 1;
    pembayaranHasNextPage = false;

    await loadPembayaran(pembayaranCurrentFilters, 1);
}

async function loadPembayaran(filters = null, page = null) {
    if (filters) {
        pembayaranCurrentFilters = {
            bulan: sanitizePembayaranText(filters.bulan),
            tahun: sanitizePembayaranText(filters.tahun),
            rt: sanitizePembayaranText(filters.rt),
            rw: sanitizePembayaranText(filters.rw),
            status: sanitizePembayaranText(filters.status)
        };
    }

    if (page !== null && page !== undefined) {
        pembayaranCurrentPage = Math.max(1, parseInt(page, 10) || 1);
    }

    setPembayaranFiltersToForm(pembayaranCurrentFilters);

    try {
        Utils.showLoading();

        const params = {
            skip: (pembayaranCurrentPage - 1) * PEMBAYARAN_PAGE_SIZE,
            limit: PEMBAYARAN_PAGE_SIZE + 1
        };

        if (pembayaranCurrentFilters.bulan) params.bulan = pembayaranCurrentFilters.bulan;
        if (pembayaranCurrentFilters.tahun) params.tahun = pembayaranCurrentFilters.tahun;
        if (pembayaranCurrentFilters.status) params.status_bayar = pembayaranCurrentFilters.status;
        if (pembayaranCurrentFilters.rt) params.rt = pembayaranCurrentFilters.rt;
        if (pembayaranCurrentFilters.rw) params.rw = pembayaranCurrentFilters.rw;

        const response = await API.pembayaran.list(params);
        const rawList = Array.isArray(response) ? response : [];

        pembayaranHasNextPage = rawList.length > PEMBAYARAN_PAGE_SIZE;
        pembayaranCurrentList = pembayaranHasNextPage ? rawList.slice(0, PEMBAYARAN_PAGE_SIZE) : rawList;

        if (pembayaranCurrentPage > 1 && pembayaranCurrentList.length === 0) {
            pembayaranCurrentPage -= 1;
            await loadPembayaran(pembayaranCurrentFilters, pembayaranCurrentPage);
            return;
        }

        renderPembayaranTable(pembayaranCurrentList);
        renderPembayaranPagination();
        await populateRtRwFiltersPembayaran(pembayaranCurrentFilters.rt, pembayaranCurrentFilters.rw);
    } catch (error) {
        console.error('Error loading pembayaran:', error);
        Utils.showToast('Gagal memuat data: ' + error.message, 'error');
        pembayaranCurrentList = [];
        pembayaranHasNextPage = false;
        renderPembayaranTable([]);
        renderPembayaranPagination();
    } finally {
        Utils.hideLoading();
    }
}

function renderPembayaranTable(pembayaranList) {
    const tbody = document.getElementById('pembayaranTableBody');

    if (!pembayaranList || pembayaranList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada data pembayaran</td></tr>';
        return;
    }

    tbody.innerHTML = pembayaranList.map((p) => `
        <tr>
            <td>
                <strong>${p.pelanggan_nama || '-'}</strong><br>
                <small>${p.pelanggan_kode || '-'}</small><br>
                <small class="text-muted">${formatRtRw(p.pelanggan_rt, p.pelanggan_rw)}</small>
            </td>
            <td>
                <div><strong>${formatPeriode(p.bulan, p.tahun)}</strong></div>
                <small class="text-muted">Meter Awal: ${formatMeter(p.meteran_awal)} m3</small><br>
                <small class="text-muted">Meter Akhir: ${formatMeter(p.meteran_akhir)} m3</small><br>
                <small class="text-muted">Pemakaian: ${formatMeter(p.pemakaian)} m3</small>
            </td>
            <td>
                <div>Air: ${Utils.formatCurrency(p.biaya_air || 0)}</div>
                <div>Admin: ${Utils.formatCurrency(p.biaya_admin || 0)}</div>
                <div><strong>Total: ${Utils.formatCurrency(p.total_tagihan || 0)}</strong></div>
            </td>
            <td>
                <span class="badge badge-${p.status_bayar === 'lunas' ? 'success' : 'danger'}">${formatStatus(p.status_bayar)}</span><br>
                <small class="text-muted">Tanggal: ${Utils.formatDateTime(p.tanggal_bayar)}</small><br>
                <small class="text-muted">Metode: ${formatMetodeBayar(p.metode_bayar)}</small>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="printNota(${p.id}, ${p.pencatatan_id || 'null'})" title="Print Struk">&#128424; Struk</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function formatPeriode(bulan, tahun) {
    if (!bulan || !tahun) return '-';
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${months[bulan - 1] || `Bulan ${bulan}`} ${tahun}`;
}

function formatMeter(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
    return Number(value);
}

function formatStatus(status) {
    if (!status) return '-';
    if (status === 'lunas') return 'Lunas';
    if (status === 'belum') return 'Belum';
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatMetodeBayar(metode) {
    if (!metode) return '-';
    return metode.charAt(0).toUpperCase() + metode.slice(1);
}

function formatRtRw(rt, rw) {
    const labels = [];
    if (rt) labels.push(`RT ${rt}`);
    if (rw) labels.push(`RW ${rw}`);
    return labels.join(' / ') || '-';
}

async function filterPembayaran() {
    await loadPembayaran(getPembayaranFiltersFromForm(), 1);
}

async function resetFilterPembayaran() {
    const currentMonth = String(new Date().getMonth() + 1);
    const currentYear = String(new Date().getFullYear());
    const defaultFilters = {
        bulan: currentMonth,
        tahun: currentYear,
        rt: '',
        rw: '',
        status: ''
    };

    setPembayaranFiltersToForm(defaultFilters);
    await loadPembayaran(defaultFilters, 1);
}

// Populate RT/RW Filters
async function populateRtRwFiltersPembayaran(selectedRt = '', selectedRw = '') {
    try {
        const { rt: rtValues, rw: rwValues } = await API.getRtRwList();

        const rtSelect = document.getElementById('filterRt');
        if (rtSelect) {
            rtSelect.innerHTML = '<option value="">Semua RT</option>' +
                rtValues.map((rt) => `<option value="${rt}" ${rt === selectedRt ? 'selected' : ''}>RT ${rt}</option>`).join('');
        }

        const rwSelect = document.getElementById('filterRw');
        if (rwSelect) {
            rwSelect.innerHTML = '<option value="">Semua RW</option>' +
                rwValues.map((rw) => `<option value="${rw}" ${rw === selectedRw ? 'selected' : ''}>RW ${rw}</option>`).join('');
        }
    } catch (error) {
        console.error('Error populating RT/RW filters:', error);
    }
}

async function printNota(pembayaranId, pencatatanId = null) {
    try {
        if (typeof showPrintStrukOption === 'function' && pencatatanId) {
            await showPrintStrukOption(pencatatanId);
            return;
        }

        Utils.showLoading();
        const pembayaran = await API.pembayaran.get(pembayaranId);
        Utils.hideLoading();

        if (typeof showPrintStrukOption === 'function' && pembayaran.pencatatan_id) {
            await showPrintStrukOption(pembayaran.pencatatan_id);
            return;
        }

        throw new Error('Fungsi print struk tidak tersedia');
    } catch (error) {
        Utils.hideLoading();
        Utils.showToast('Gagal menyiapkan print: ' + error.message, 'error');
    }
}

function generateMonthOptions(currentMonth) {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return months.map((m, i) => `<option value="${i + 1}" ${i + 1 === currentMonth ? 'selected' : ''}>${m}</option>`).join('');
}
