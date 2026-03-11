// Pelanggan Page Functions

const PELANGGAN_PAGE_SIZE = 20;

let pelangganList = [];
let pelangganCurrentFilters = {
    search: '',
    kategori: '',
    status: '',
    rt: '',
    rw: ''
};
let pelangganCurrentPage = 1;
let pelangganHasNextPage = false;

function sanitizeText(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function toUpperText(value) {
    return sanitizeText(value).toUpperCase();
}

function normalizeRtRwValue(value) {
    const normalized = toUpperText(value);
    if (!normalized) return '';

    if (/^\d+$/.test(normalized)) {
        return normalized.padStart(3, '0');
    }

    return normalized;
}

function formatRtRw(rt, rw) {
    const labels = [];
    if (rt) labels.push(`RT ${rt}`);
    if (rw) labels.push(`RW ${rw}`);
    return labels.join(' / ') || '-';
}

function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getPelangganFiltersFromForm() {
    return {
        search: sanitizeText(document.getElementById('searchPelanggan')?.value),
        kategori: sanitizeText(document.getElementById('filterKategori')?.value),
        status: sanitizeText(document.getElementById('filterStatus')?.value),
        rt: sanitizeText(document.getElementById('filterRt')?.value),
        rw: sanitizeText(document.getElementById('filterRw')?.value)
    };
}

function setPelangganFiltersToForm(filters) {
    const searchInput = document.getElementById('searchPelanggan');
    const kategoriSelect = document.getElementById('filterKategori');
    const statusSelect = document.getElementById('filterStatus');

    if (searchInput) searchInput.value = filters.search || '';
    if (kategoriSelect) kategoriSelect.value = filters.kategori || '';
    if (statusSelect) statusSelect.value = filters.status || '';
}

function consumePelangganPrefillFilters() {
    const prefill = window.PagePrefill?.consume?.('pelanggan');
    if (!prefill || typeof prefill !== 'object') return null;

    return {
        search: sanitizeText(prefill.search),
        kategori: sanitizeText(prefill.kategori),
        status: sanitizeText(prefill.status),
        rt: sanitizeText(prefill.rt),
        rw: sanitizeText(prefill.rw)
    };
}

function getPelangganName(id) {
    const pelanggan = pelangganList.find((item) => item.id === id);
    return pelanggan?.nama || `#${id}`;
}

function normalizeMeteranAwal(value, fallback = 0) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 0) return fallback;
    return parsed;
}

function buildDefaultRtRwList(maxValue = 30) {
    return Array.from({ length: maxValue }, (_, index) => String(index + 1).padStart(3, '0'));
}

function buildSelectOptions(values, selectedValue, typeLabel) {
    const selectedNormalized = normalizeRtRwValue(selectedValue);
    const normalizedSet = new Set();

    values.forEach((value) => {
        const normalized = normalizeRtRwValue(value);
        if (normalized) normalizedSet.add(normalized);
    });

    if (selectedNormalized) {
        normalizedSet.add(selectedNormalized);
    }

    const sortedOptions = Array.from(normalizedSet).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));

    return `
        <option value="">Pilih ${typeLabel}</option>
        ${sortedOptions.map((value) => `
            <option value="${escapeHtml(value)}" ${value === selectedNormalized ? 'selected' : ''}>${typeLabel} ${escapeHtml(value)}</option>
        `).join('')}
    `;
}

async function getRtRwSelectFields(selectedRt = '', selectedRw = '') {
    const defaults = buildDefaultRtRwList();

    try {
        const { rt: rtValues, rw: rwValues } = await API.getRtRwList();

        const rtOptions = buildSelectOptions([...(rtValues || []), ...defaults], selectedRt, 'RT');
        const rwOptions = buildSelectOptions([...(rwValues || []), ...defaults], selectedRw, 'RW');

        return `
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <div class="form-group" style="flex: 1; min-width: 160px;">
                    <label>RT</label>
                    <select name="rt" class="form-control">
                        ${rtOptions}
                    </select>
                </div>
                <div class="form-group" style="flex: 1; min-width: 160px;">
                    <label>RW</label>
                    <select name="rw" class="form-control">
                        ${rwOptions}
                    </select>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading RT/RW options:', error);

        const rtOptions = buildSelectOptions(defaults, selectedRt, 'RT');
        const rwOptions = buildSelectOptions(defaults, selectedRw, 'RW');

        return `
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <div class="form-group" style="flex: 1; min-width: 160px;">
                    <label>RT</label>
                    <select name="rt" class="form-control">
                        ${rtOptions}
                    </select>
                </div>
                <div class="form-group" style="flex: 1; min-width: 160px;">
                    <label>RW</label>
                    <select name="rw" class="form-control">
                        ${rwOptions}
                    </select>
                </div>
            </div>
        `;
    }
}

function extractPelangganDataFromForm(formData, mode = 'create') {
    const isCreate = mode === 'create';
    const data = {
        nama: toUpperText(formData.get('nama')),
        kategori: sanitizeText(formData.get('kategori')),
        alamat: toUpperText(formData.get('alamat')),
        rt: normalizeRtRwValue(formData.get('rt')),
        rw: normalizeRtRwValue(formData.get('rw')),
        no_hp: sanitizeText(formData.get('no_hp')),
        meteran_awal: normalizeMeteranAwal(formData.get('meteran_awal'), 0)
    };

    const tanggalPemasangan = sanitizeText(formData.get('tanggal_pemasangan'));
    if (tanggalPemasangan) {
        data.tanggal_pemasangan = tanggalPemasangan;
    }

    if (isCreate) {
        data.alamat = data.alamat || null;
        data.rt = data.rt || null;
        data.rw = data.rw || null;
        data.no_hp = data.no_hp || null;
    }

    if (mode === 'edit') {
        data.status = sanitizeText(formData.get('status')) || 'aktif';
    }

    const petugasId = sanitizeText(formData.get('petugas_id'));
    if (petugasId) {
        const parsedPetugasId = parseInt(petugasId, 10);
        if (!Number.isNaN(parsedPetugasId)) {
            data.petugas_id = parsedPetugasId;
        }
    }

    return data;
}

async function getPetugasOptions(selectedId = '') {
    const user = Config.getUser();
    if (!user || user.role !== 'admin') return '';

    try {
        const petugasList = await API.admin.users.list('petugas');
        const normalizedSelectedId = String(selectedId || '');

        const options = [
            '<option value="">Tetap / Otomatis</option>',
            ...(Array.isArray(petugasList)
                ? petugasList.map((petugas) => {
                    const id = String(petugas.id);
                    const selected = id === normalizedSelectedId ? 'selected' : '';
                    return `<option value="${id}" ${selected}>${escapeHtml(petugas.nama_lengkap)}</option>`;
                })
                : [])
        ].join('');

        return `
            <div class="form-group">
                <label>Petugas</label>
                <select name="petugas_id" class="form-control">
                    ${options}
                </select>
                <small class="text-muted">Kosongkan untuk mengikuti petugas saat ini.</small>
            </div>
        `;
    } catch (error) {
        console.error('Error loading petugas options:', error);
        return `
            <div class="form-group">
                <label>Petugas</label>
                <input type="text" class="form-control" value="Gagal memuat daftar petugas" disabled>
            </div>
        `;
    }
}

function renderPelangganPagination() {
    const container = document.getElementById('pelangganPagination');
    if (!container) return;

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center" style="margin-top: 1rem; gap: 0.75rem; flex-wrap: wrap;">
            <small class="text-muted">Halaman ${pelangganCurrentPage}</small>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-secondary btn-sm" onclick="goToPrevPelangganPage()" ${pelangganCurrentPage <= 1 ? 'disabled' : ''}>&#11013;&#65039; Sebelumnya</button>
                <button class="btn btn-secondary btn-sm" onclick="goToNextPelangganPage()" ${!pelangganHasNextPage ? 'disabled' : ''}>Berikutnya &#10145;&#65039;</button>
            </div>
        </div>
    `;
}

async function goToPrevPelangganPage() {
    if (pelangganCurrentPage <= 1) return;
    await loadPelanggan(pelangganCurrentFilters, pelangganCurrentPage - 1);
}

async function goToNextPelangganPage() {
    if (!pelangganHasNextPage) return;
    await loadPelanggan(pelangganCurrentFilters, pelangganCurrentPage + 1);
}

// Render Pelanggan Page
async function renderPelangganPage() {
    const contentWrapper = document.getElementById('contentWrapper');

    const html = `
        <div class="page-content">
            <div class="page-header">
                <div class="page-title">
                    <h2>Data Pelanggan</h2>
                </div>
                <div class="page-actions">
                    <button class="btn btn-primary" onclick="showAddPelangganModal()">
                        &#10133; Tambah Pelanggan
                    </button>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-body">
                    <div class="filter-bar">
                        <div class="form-group" style="flex: 2;">
                            <label>&#128269; Cari</label>
                            <input type="text" id="searchPelanggan" class="form-control" placeholder="Nama, kode pelanggan, atau no. HP">
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
                                <option value="aktif">Aktif</option>
                                <option value="nonaktif">Nonaktif</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Kategori</label>
                            <select id="filterKategori" class="form-control">
                                <option value="">Semua Kategori</option>
                                <option value="personal">Personal</option>
                                <option value="bisnis">Bisnis</option>
                            </select>
                        </div>
                        <div class="form-group" style="flex: 0 0 auto; min-width: auto;">
                            <label>&nbsp;</label>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-secondary" onclick="filterPelanggan()">&#128269; Filter</button>
                                <button class="btn btn-primary" onclick="resetFilterPelanggan()">&#128260; Reset</button>
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
                                    <th>RT/RW</th>
                                    <th>Kategori</th>
                                    <th>Meteran Awal</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="pelangganTableBody">
                                <tr>
                                    <td colspan="7" class="text-center">Loading...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div id="pelangganPagination"></div>
                </div>
            </div>
        </div>
    `;

    contentWrapper.innerHTML = html;

    pelangganCurrentFilters = {
        search: '',
        kategori: '',
        status: '',
        rt: '',
        rw: ''
    };

    const prefillFilters = consumePelangganPrefillFilters();
    if (prefillFilters) {
        pelangganCurrentFilters = {
            ...pelangganCurrentFilters,
            ...prefillFilters
        };
    }

    pelangganCurrentPage = 1;
    pelangganHasNextPage = false;

    const searchInput = document.getElementById('searchPelanggan');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                filterPelanggan();
            }
        });
    }

    await loadPelanggan(pelangganCurrentFilters, 1);
}

// Load Pelanggan Data
async function loadPelanggan(filters = null, page = null) {
    if (filters) {
        pelangganCurrentFilters = {
            search: sanitizeText(filters.search),
            kategori: sanitizeText(filters.kategori),
            status: sanitizeText(filters.status),
            rt: sanitizeText(filters.rt),
            rw: sanitizeText(filters.rw)
        };
    }

    if (page !== null && page !== undefined) {
        pelangganCurrentPage = Math.max(1, parseInt(page, 10) || 1);
    }

    setPelangganFiltersToForm(pelangganCurrentFilters);

    try {
        Utils.showLoading();

        const params = {
            skip: (pelangganCurrentPage - 1) * PELANGGAN_PAGE_SIZE,
            limit: PELANGGAN_PAGE_SIZE + 1
        };

        if (pelangganCurrentFilters.search) params.search = pelangganCurrentFilters.search;
        if (pelangganCurrentFilters.kategori) params.kategori = pelangganCurrentFilters.kategori;
        if (pelangganCurrentFilters.status) params.status = pelangganCurrentFilters.status;
        if (pelangganCurrentFilters.rt) params.rt = pelangganCurrentFilters.rt;
        if (pelangganCurrentFilters.rw) params.rw = pelangganCurrentFilters.rw;

        const response = await API.pelanggan.list(params);
        const rawList = Array.isArray(response) ? response : [];

        pelangganHasNextPage = rawList.length > PELANGGAN_PAGE_SIZE;
        pelangganList = pelangganHasNextPage ? rawList.slice(0, PELANGGAN_PAGE_SIZE) : rawList;

        if (pelangganCurrentPage > 1 && pelangganList.length === 0) {
            pelangganCurrentPage -= 1;
            await loadPelanggan(pelangganCurrentFilters, pelangganCurrentPage);
            return;
        }

        renderPelangganTable(pelangganList);
        await populateRtRwFilters(pelangganCurrentFilters.rt, pelangganCurrentFilters.rw);
        renderPelangganPagination();
    } catch (error) {
        console.error('Error loading pelanggan:', error);
        Utils.showToast('Gagal memuat data pelanggan: ' + error.message, 'error');
        pelangganList = [];
        pelangganHasNextPage = false;
        renderPelangganTable([]);
        renderPelangganPagination();
    } finally {
        Utils.hideLoading();
    }
}

// Populate RT/RW Filters
async function populateRtRwFilters(selectedRt = '', selectedRw = '') {
    try {
        const { rt: rtValues, rw: rwValues } = await API.getRtRwList();

        const rtSelect = document.getElementById('filterRt');
        if (rtSelect) {
            const rtOptions = buildSelectOptions([...(rtValues || [])], selectedRt, 'RT')
                .replace('<option value="">Pilih RT</option>', '<option value="">Semua RT</option>');
            rtSelect.innerHTML = rtOptions;
        }

        const rwSelect = document.getElementById('filterRw');
        if (rwSelect) {
            const rwOptions = buildSelectOptions([...(rwValues || [])], selectedRw, 'RW')
                .replace('<option value="">Pilih RW</option>', '<option value="">Semua RW</option>');
            rwSelect.innerHTML = rwOptions;
        }
    } catch (error) {
        console.error('Error populating RT/RW filters:', error);
    }
}

// Render Pelanggan Table
function renderPelangganTable(list) {
    const tbody = document.getElementById('pelangganTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Tidak ada data pelanggan</td></tr>';
        return;
    }

    tbody.innerHTML = list.map((pelanggan) => {
        const statusClass = pelanggan.status === 'aktif' ? 'success' : 'danger';
        const kategoriClass = pelanggan.kategori === 'bisnis' ? 'warning' : 'primary';
        const meteranAwal = normalizeMeteranAwal(pelanggan.meteran_awal, 0);
        const alamat = sanitizeText(pelanggan.alamat);
        const noHp = sanitizeText(pelanggan.no_hp);
        const petugasNama = sanitizeText(pelanggan.petugas_nama);
        const rt = sanitizeText(pelanggan.rt);
        const rw = sanitizeText(pelanggan.rw);

        return `
            <tr>
                <td>
                    <span class="badge badge-primary">${escapeHtml(pelanggan.kode_pelanggan)}</span>
                </td>
                <td>
                    <strong>${escapeHtml(pelanggan.nama)}</strong><br>
                    <small class="text-muted">${escapeHtml(alamat || '-')}</small><br>
                    <small class="text-muted">HP: ${escapeHtml(noHp || '-')}</small>
                    ${petugasNama ? `<br><small class="text-muted">Petugas: ${escapeHtml(petugasNama)}</small>` : ''}
                </td>
                <td>${formatRtRw(escapeHtml(rt), escapeHtml(rw))}</td>
                <td><span class="badge badge-${kategoriClass}">${escapeHtml((pelanggan.kategori || '-').toUpperCase())}</span></td>
                <td>${meteranAwal} m3</td>
                <td><span class="badge badge-${statusClass}">${escapeHtml((pelanggan.status || '-').toUpperCase())}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="showEditPelangganModal(${pelanggan.id})">&#9998;&#65039; Edit</button>
                        ${pelanggan.status === 'aktif'
                            ? `<button class="btn btn-sm btn-danger" onclick="deactivatePelanggan(${pelanggan.id})">&#128683; Nonaktifkan</button>`
                            : `<button class="btn btn-sm btn-success" onclick="activatePelanggan(${pelanggan.id})">&#9989; Aktifkan</button>`
                        }
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Filter Pelanggan
async function filterPelanggan() {
    await loadPelanggan(getPelangganFiltersFromForm(), 1);
}

async function resetFilterPelanggan() {
    const defaultFilters = {
        search: '',
        kategori: '',
        status: '',
        rt: '',
        rw: ''
    };

    setPelangganFiltersToForm(defaultFilters);
    await loadPelanggan(defaultFilters, 1);
}

// Show Add Pelanggan Modal
async function showAddPelangganModal() {
    const petugasField = await getPetugasOptions('');
    const rtRwFields = await getRtRwSelectFields('', '');

    const content = `
        <form id="addPelangganForm">
            <div class="form-group">
                <label class="required">Nama</label>
                <input type="text" name="nama" class="form-control text-uppercase" required>
            </div>
            <div class="form-group">
                <label class="required">Kategori</label>
                <select name="kategori" class="form-control" required>
                    <option value="personal">Personal</option>
                    <option value="bisnis">Bisnis</option>
                </select>
            </div>
            <div class="form-group">
                <label>Alamat</label>
                <textarea name="alamat" class="form-control text-uppercase" rows="2"></textarea>
            </div>
            ${rtRwFields}
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <div class="form-group" style="flex: 1; min-width: 160px;">
                    <label>No. HP</label>
                    <input type="text" name="no_hp" class="form-control" placeholder="08xxxxxxxxxx">
                </div>
                <div class="form-group" style="flex: 1; min-width: 160px;">
                    <label>Meteran Awal (m3)</label>
                    <input type="number" name="meteran_awal" class="form-control" value="0" min="0">
                </div>
            </div>
            <div class="form-group">
                <label>Tanggal Pemasangan</label>
                <input type="date" name="tanggal_pemasangan" class="form-control">
            </div>
            ${petugasField}
            <div class="form-group">
                <button type="submit" class="btn btn-primary btn-block">&#128190; Simpan Pelanggan</button>
            </div>
        </form>
    `;

    Utils.showModal('Tambah Pelanggan', content);
    document.getElementById('addPelangganForm')?.addEventListener('submit', handleAddPelanggan);
}

// Handle Add Pelanggan
async function handleAddPelanggan(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = extractPelangganDataFromForm(formData, 'create');

    try {
        Utils.showLoading();
        await API.pelanggan.createAuto(data);
        API.invalidateRtRwCache();

        Utils.hideModal();
        Utils.showToast('Pelanggan berhasil ditambahkan!', 'success');
        await loadPelanggan(pelangganCurrentFilters, 1);
    } catch (error) {
        Utils.showToast('Gagal menambah pelanggan: ' + error.message, 'error');
    } finally {
        Utils.hideLoading();
    }
}

// Show Edit Pelanggan Modal
async function showEditPelangganModal(id) {
    try {
        Utils.showLoading();
        const pelanggan = await API.pelanggan.get(id);
        const petugasField = await getPetugasOptions(pelanggan.petugas_id || '');
        const rtRwFields = await getRtRwSelectFields(pelanggan.rt || '', pelanggan.rw || '');
        const tanggalPemasangan = formatDateForInput(pelanggan.created_at);

        const content = `
            <form id="editPelangganForm">
                <input type="hidden" name="id" value="${pelanggan.id}">
                <div class="form-group">
                    <label>Kode Pelanggan</label>
                    <input type="text" class="form-control" value="${escapeHtml(pelanggan.kode_pelanggan)}" disabled>
                </div>
                <div class="form-group">
                    <label class="required">Nama</label>
                    <input type="text" name="nama" class="form-control text-uppercase" value="${escapeHtml(pelanggan.nama)}" required>
                </div>
                <div class="form-group">
                    <label class="required">Kategori</label>
                    <select name="kategori" class="form-control" required>
                        <option value="personal" ${pelanggan.kategori === 'personal' ? 'selected' : ''}>Personal</option>
                        <option value="bisnis" ${pelanggan.kategori === 'bisnis' ? 'selected' : ''}>Bisnis</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Alamat</label>
                    <textarea name="alamat" class="form-control text-uppercase" rows="2">${escapeHtml(pelanggan.alamat || '')}</textarea>
                </div>
                ${rtRwFields}
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <div class="form-group" style="flex: 1; min-width: 160px;">
                        <label>No. HP</label>
                        <input type="text" name="no_hp" class="form-control" value="${escapeHtml(pelanggan.no_hp || '')}">
                    </div>
                    <div class="form-group" style="flex: 1; min-width: 160px;">
                        <label>Meteran Awal (m3)</label>
                        <input type="number" name="meteran_awal" class="form-control" value="${normalizeMeteranAwal(pelanggan.meteran_awal, 0)}" min="0">
                    </div>
                </div>
                <div class="form-group">
                    <label>Tanggal Pemasangan</label>
                    <input type="date" name="tanggal_pemasangan" class="form-control" value="${tanggalPemasangan}">
                </div>
                ${petugasField}
                <div class="form-group">
                    <label>Status</label>
                    <select name="status" class="form-control">
                        <option value="aktif" ${pelanggan.status === 'aktif' ? 'selected' : ''}>Aktif</option>
                        <option value="nonaktif" ${pelanggan.status === 'nonaktif' ? 'selected' : ''}>Nonaktif</option>
                    </select>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary btn-block">&#128190; Update Pelanggan</button>
                </div>
            </form>
        `;

        Utils.showModal('Edit Pelanggan', content);
        document.getElementById('editPelangganForm')?.addEventListener('submit', (e) => handleEditPelanggan(e, id));
    } catch (error) {
        Utils.showToast('Gagal memuat data pelanggan: ' + error.message, 'error');
    } finally {
        Utils.hideLoading();
    }
}

// Handle Edit Pelanggan
async function handleEditPelanggan(e, id) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = extractPelangganDataFromForm(formData, 'edit');

    try {
        Utils.showLoading();
        await API.pelanggan.update(id, data);
        API.invalidateRtRwCache();

        Utils.hideModal();
        Utils.showToast('Pelanggan berhasil diupdate!', 'success');
        await loadPelanggan(pelangganCurrentFilters, pelangganCurrentPage);
    } catch (error) {
        Utils.showToast('Gagal update pelanggan: ' + error.message, 'error');
    } finally {
        Utils.hideLoading();
    }
}

// Deactivate Pelanggan
async function deactivatePelanggan(id) {
    const nama = getPelangganName(id);
    if (!confirm(`Apakah Anda yakin ingin menonaktifkan pelanggan "${nama}"?\n\nPelanggan nonaktif tidak bisa dicatat meterannya.`)) {
        return;
    }

    try {
        Utils.showLoading();
        await API.pelanggan.update(id, { status: 'nonaktif' });
        Utils.showToast('Pelanggan berhasil dinonaktifkan!', 'success');
        await loadPelanggan(pelangganCurrentFilters, pelangganCurrentPage);
    } catch (error) {
        Utils.showToast('Gagal menonaktifkan pelanggan: ' + error.message, 'error');
    } finally {
        Utils.hideLoading();
    }
}

// Activate Pelanggan
async function activatePelanggan(id) {
    const nama = getPelangganName(id);
    if (!confirm(`Apakah Anda yakin ingin mengaktifkan kembali pelanggan "${nama}"?`)) {
        return;
    }

    try {
        Utils.showLoading();
        await API.pelanggan.update(id, { status: 'aktif' });
        Utils.showToast('Pelanggan berhasil diaktifkan kembali!', 'success');
        await loadPelanggan(pelangganCurrentFilters, pelangganCurrentPage);
    } catch (error) {
        Utils.showToast('Gagal mengaktifkan pelanggan: ' + error.message, 'error');
    } finally {
        Utils.hideLoading();
    }
}

