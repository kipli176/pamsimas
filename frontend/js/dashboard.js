// Dashboard Functions

const DASHBOARD_MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
const DASHBOARD_ACTIVITY_PAGE_SIZE = 10;

let dashboardActivityPage = 1;
let dashboardActivityHasNextPage = false;

function setTextById(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function generateDashboardMonthOptions(currentMonth) {
    return DASHBOARD_MONTHS.map((month, index) => {
        const monthNum = index + 1;
        return `<option value="${monthNum}" ${monthNum === currentMonth ? 'selected' : ''}>${month}</option>`;
    }).join('');
}

function generateDashboardYearOptions(currentYear) {
    const years = [currentYear, currentYear - 1, currentYear - 2];
    return years.map((year) => `<option value="${year}">${year}</option>`).join('');
}

function formatPeriodeDisplay(bulan, tahun) {
    const monthName = DASHBOARD_MONTHS[Number(bulan) - 1] || `Bulan ${bulan}`;
    return `${monthName} ${tahun}`;
}

function getDashboardPeriod() {
    const now = new Date();
    const bulanSelect = document.getElementById('dashboardBulan');
    const tahunSelect = document.getElementById('dashboardTahun');

    const bulan = bulanSelect ? parseInt(bulanSelect.value, 10) : now.getMonth() + 1;
    const tahun = tahunSelect ? parseInt(tahunSelect.value, 10) : now.getFullYear();

    return {
        bulan,
        tahun,
        periodeDisplay: formatPeriodeDisplay(bulan, tahun)
    };
}

function resetDashboardPeriod() {
    const now = new Date();
    const bulanSelect = document.getElementById('dashboardBulan');
    const tahunSelect = document.getElementById('dashboardTahun');

    if (bulanSelect) bulanSelect.value = String(now.getMonth() + 1);
    if (tahunSelect) tahunSelect.value = String(now.getFullYear());

    refreshDashboard();
}

function syncDashboardPeriodLabels() {
    const { periodeDisplay } = getDashboardPeriod();
    setTextById('dashboardPeriodInfo', `Data periode ${periodeDisplay}. Klik Tampilkan Data untuk memperbarui.`);
    setTextById('dashboardActivityPeriod', `Periode: ${periodeDisplay}`);
}

function renderDashboardActivityPagination(totalOnPage = 0) {
    const container = document.getElementById('dashboardActivityPagination');
    if (!container) return;

    const pageInfo = totalOnPage > 0
        ? `Halaman ${dashboardActivityPage} (${totalOnPage} aktivitas)`
        : `Halaman ${dashboardActivityPage}`;

    container.innerHTML = `
        <div class="pagination-row">
            <small class="text-muted">${pageInfo}</small>
            <div class="pagination-actions">
                <button class="btn btn-secondary btn-sm" onclick="goToPrevDashboardActivityPage()" ${dashboardActivityPage <= 1 ? 'disabled' : ''}>&#11013;&#65039; Sebelumnya</button>
                <button class="btn btn-secondary btn-sm" onclick="goToNextDashboardActivityPage()" ${!dashboardActivityHasNextPage ? 'disabled' : ''}>Berikutnya &#10145;&#65039;</button>
            </div>
        </div>
    `;
}

async function goToPrevDashboardActivityPage() {
    if (dashboardActivityPage <= 1) return;
    await loadRecentActivity(dashboardActivityPage - 1);
}

async function goToNextDashboardActivityPage() {
    if (!dashboardActivityHasNextPage) return;
    await loadRecentActivity(dashboardActivityPage + 1);
}

async function renderDashboard() {
    const user = Config.getUser();
    const contentWrapper = document.getElementById('contentWrapper');

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let html = `
        <div class="page-content">
            <div class="card mb-3">
                <div class="card-body">
                    <div class="filter-bar dashboard-filter-bar">
                        <div class="form-group dashboard-filter-info">
                            <label>&#128197; Periode Dashboard</label>
                            <small class="text-muted dashboard-filter-hint" id="dashboardPeriodInfo">Pilih bulan-tahun, lalu klik Tampilkan Data.</small>
                        </div>
                        <div class="form-group">
                            <label>&#128198; Bulan</label>
                            <select id="dashboardBulan" class="form-control">
                                ${generateDashboardMonthOptions(currentMonth)}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>&#128467;&#65039; Tahun</label>
                            <select id="dashboardTahun" class="form-control">
                                ${generateDashboardYearOptions(currentYear)}
                            </select>
                        </div>
                        <div class="form-group dashboard-filter-actions">
                            
                            <div class="dashboard-filter-buttons">
                                <button class="btn btn-secondary" onclick="refreshDashboard()">&#128202; Tampilkan Data</button>
                                <button class="btn btn-primary" onclick="resetDashboardPeriod()">&#128260; Periode Saat Ini</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="stats-grid">
    `;

    if (user.role === 'petugas') {
        html += `
                <div class="stat-card">
                    <h3>&#128203; Total Pelanggan</h3>
                    <div class="value" id="statPelanggan">-</div>
                    <small class="text-white">Semua pelanggan aktif</small>
                </div>
                <div class="stat-card success">
                    <h3>&#9989; Sudah Dicatat</h3>
                    <div class="value" id="statSudahDicatat">-</div>
                    <small class="text-white" id="statSudahDicatatPercent">0% dari total</small>
                </div>
                <div class="stat-card warning">
                    <h3>&#9203; Belum Dicatat</h3>
                    <div class="value" id="statBelumDicatat">-</div>
                    <small class="text-white" id="statBelumDicatatPercent">0% dari total</small>
                </div>
                <div class="stat-card">
                    <h3>&#128176; Sudah Bayar</h3>
                    <div class="value" id="statSudahBayar">-</div>
                    <small class="text-white">Pembayaran lunas</small>
                </div>
                <div class="stat-card danger">
                    <h3>&#10060; Belum Bayar</h3>
                    <div class="value" id="statBelumBayar">-</div>
                    <small class="text-white">Menunggu pembayaran</small>
                </div>
                <div class="stat-card">
                    <h3>&#128184; Total Pendapatan</h3>
                    <div class="value" id="statPendapatan">-</div>
                    <small class="text-white" id="statPendapatanInfo">Dari pembayaran bulan ini</small>
                </div>
        `;
    } else {
        html += `
                <div class="stat-card">
                    <h3>&#128203; Total Pelanggan</h3>
                    <div class="value" id="statPelanggan">-</div>
                    <small class="text-white">Semua pelanggan aktif</small>
                </div>
                <div class="stat-card success">
                    <h3>&#128101; Total Petugas</h3>
                    <div class="value" id="statPetugas">-</div>
                    <small class="text-white">Petugas aktif</small>
                </div>
                <div class="stat-card">
                    <h3>&#9989; Sudah Dicatat</h3>
                    <div class="value" id="statSudahDicatat">-</div>
                    <small class="text-white" id="statSudahDicatatPercent">0% dari total</small>
                </div>
                <div class="stat-card warning">
                    <h3>&#9203; Belum Dicatat</h3>
                    <div class="value" id="statBelumDicatat">-</div>
                    <small class="text-white" id="statBelumDicatatPercent">0% dari total</small>
                </div>
                <div class="stat-card">
                    <h3>&#128176; Pendapatan Periode</h3>
                    <div class="value" id="statPendapatanBulanIni">-</div>
                    <small class="text-white" id="statPendapatanInfo">Total pembayaran lunas</small>
                </div>
                <div class="stat-card danger">
                    <h3>&#10060; Tagihan Tertunda</h3>
                    <div class="value" id="statTagihanTertunda">-</div>
                    <small class="text-white">Total belum bayar (all time)</small>
                </div>
        `;
    }

    html += `
            </div>

            <div class="card mt-3">
                <div class="card-header dashboard-activity-header">
                    <h3>&#128202; Aktivitas Terkini</h3>
                    <small class="dashboard-activity-subtitle" id="dashboardActivityPeriod">Periode: -</small>
                </div>
                <div class="card-body">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Tipe</th>
                                    <th>Pelanggan</th>
                                    <th>Periode</th>
                                    <th>Waktu</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody id="activityTableBody">
                                <tr><td colspan="5" class="text-center">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div id="dashboardActivityPagination"></div>
                </div>
            </div>
        </div>
    `;

    contentWrapper.innerHTML = html;
    const tahunSelect = document.getElementById('dashboardTahun');
    if (tahunSelect) {
        tahunSelect.value = String(currentYear);
    }
    syncDashboardPeriodLabels();
    await refreshDashboard();
}

async function refreshDashboard() {
    const user = Config.getUser();

    try {
        Utils.showLoading();
        dashboardActivityPage = 1;
        syncDashboardPeriodLabels();

        if (user.role === 'petugas') {
            await loadPetugasStats();
        } else {
            await loadAdminStats();
        }

        await loadRecentActivity(dashboardActivityPage);
    } catch (error) {
        console.error('Error refreshing dashboard:', error);
        Utils.showToast('Gagal memuat dashboard: ' + error.message, 'error');
    } finally {
        Utils.hideLoading();
    }
}

async function loadPetugasStats() {
    try {
        const { bulan, tahun, periodeDisplay } = getDashboardPeriod();

        const [allPelanggan, pencatatan, pembayaranLunas] = await Promise.all([
            API.pelanggan.list({ limit: 1000 }),
            API.pencatatan.list({ bulan, tahun, limit: 1000 }),
            API.pembayaran.list({ bulan, tahun, status_bayar: 'lunas', limit: 1000 })
        ]);

        const totalPelanggan = (allPelanggan || []).filter((item) => item.status === 'aktif').length;
        const sudahDicatat = (pencatatan || []).filter((item) => item.status_catat === 'dicatat').length;
        const belumDicatat = Math.max(0, totalPelanggan - sudahDicatat);
        const sudahBayar = (pencatatan || []).filter((item) => !!item.pembayaran_id).length;
        const belumBayar = (pencatatan || []).filter((item) => !item.pembayaran_id).length;
        const totalPendapatan = (pembayaranLunas || []).reduce((total, item) => total + (item.total_tagihan || 0), 0);

        setTextById('statPelanggan', totalPelanggan);
        setTextById('statSudahDicatat', sudahDicatat);
        setTextById('statBelumDicatat', belumDicatat);
        setTextById('statSudahBayar', sudahBayar);
        setTextById('statBelumBayar', belumBayar);
        setTextById('statPendapatan', Utils.formatCurrency(totalPendapatan));
        setTextById('statPendapatanInfo', `Pendapatan ${periodeDisplay}`);

        if (totalPelanggan > 0) {
            const sudahPercent = Math.round((sudahDicatat / totalPelanggan) * 100);
            const belumPercent = Math.round((belumDicatat / totalPelanggan) * 100);
            setTextById('statSudahDicatatPercent', `${sudahPercent}% dari total`);
            setTextById('statBelumDicatatPercent', `${belumPercent}% dari total`);
        } else {
            setTextById('statSudahDicatatPercent', '0% dari total');
            setTextById('statBelumDicatatPercent', '0% dari total');
        }
    } catch (error) {
        console.error('Error loading petugas stats:', error);
    }
}

async function loadAdminStats() {
    try {
        const { bulan, tahun, periodeDisplay } = getDashboardPeriod();

        const [allPelanggan, users, pencatatan, pembayaranLunas] = await Promise.all([
            API.pelanggan.list({ limit: 1000 }),
            API.admin.users.list('petugas'),
            API.pencatatan.list({ bulan, tahun, limit: 1000 }),
            API.pembayaran.list({ bulan, tahun, status_bayar: 'lunas', limit: 1000 })
        ]);

        const totalPelanggan = (allPelanggan || []).filter((item) => item.status === 'aktif').length;
        const totalPetugas = Array.isArray(users) ? users.length : 0;
        const sudahDicatat = (pencatatan || []).filter((item) => item.status_catat === 'dicatat').length;
        const belumDicatat = Math.max(0, totalPelanggan - sudahDicatat);
        const totalPendapatanPeriode = (pembayaranLunas || []).reduce((total, item) => total + (item.total_tagihan || 0), 0);

        setTextById('statPelanggan', totalPelanggan);
        setTextById('statPetugas', totalPetugas);
        setTextById('statSudahDicatat', sudahDicatat);
        setTextById('statBelumDicatat', belumDicatat);
        setTextById('statPendapatanBulanIni', Utils.formatCurrency(totalPendapatanPeriode));
        setTextById('statPendapatanInfo', periodeDisplay);

        if (totalPelanggan > 0) {
            const sudahPercent = Math.round((sudahDicatat / totalPelanggan) * 100);
            const belumPercent = Math.round((belumDicatat / totalPelanggan) * 100);
            setTextById('statSudahDicatatPercent', `${sudahPercent}% dari total`);
            setTextById('statBelumDicatatPercent', `${belumPercent}% dari total`);
        } else {
            setTextById('statSudahDicatatPercent', '0% dari total');
            setTextById('statBelumDicatatPercent', '0% dari total');
        }

        setTextById('statTagihanTertunda', 'Menghitung...');
        const allPencatatan = await API.pencatatan.list({ status_catat: 'dicatat', limit: 10000 });
        let tagihanTertunda = 0;

        for (const catat of allPencatatan || []) {
            if (!catat.pembayaran_id) {
                try {
                    const tagihan = await API.pencatatan.getTagihan(catat.id);
                    tagihanTertunda += tagihan.total_tagihan || 0;
                } catch (e) {
                    console.warn('Gagal mengambil tagihan untuk pencatatan:', catat.id, e);
                }
            }
        }

        setTextById('statTagihanTertunda', Utils.formatCurrency(tagihanTertunda));
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

async function loadRecentActivity(page = 1) {
    try {
        const { bulan, tahun } = getDashboardPeriod();
        const tbody = document.getElementById('activityTableBody');
        if (!tbody) return;

        const safePage = Math.max(1, parseInt(page, 10) || 1);
        const pencatatan = await API.pencatatan.list({
            bulan,
            tahun,
            limit: DASHBOARD_ACTIVITY_PAGE_SIZE,
            page: safePage
        });
        const activityRows = Array.isArray(pencatatan) ? pencatatan : [];

        if (activityRows.length === 0 && safePage > 1) {
            dashboardActivityPage = safePage - 1;
            await loadRecentActivity(dashboardActivityPage);
            return;
        }

        dashboardActivityPage = safePage;
        dashboardActivityHasNextPage = activityRows.length === DASHBOARD_ACTIVITY_PAGE_SIZE;

        if (activityRows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada aktivitas periode ini</td></tr>';
            renderDashboardActivityPagination(0);
            return;
        }

        const activities = activityRows
            .sort((a, b) => {
                const aDate = new Date(a.updated_at || a.created_at || 0).getTime();
                const bDate = new Date(b.updated_at || b.created_at || 0).getTime();
                return bDate - aDate;
            })
            .map((catat) => {
                let activityType = '&#9203; Pending';
                let status = 'Pending';
                let statusClass = 'badge-danger';

                if (catat.pembayaran_id) {
                    activityType = '&#128176; Pembayaran';
                    status = 'Lunas';
                    statusClass = 'badge-success';
                } else if (catat.status_catat === 'dicatat') {
                    activityType = '&#128221; Pencatatan';
                    status = 'Belum Bayar';
                    statusClass = 'badge-warning';
                }

                return {
                    type: activityType,
                    pelanggan: catat.pelanggan_nama || `Pelanggan #${catat.pelanggan_id}`,
                    periode: formatPeriodeDisplay(catat.bulan, catat.tahun),
                    waktu: Utils.formatDateTime(catat.updated_at || catat.created_at),
                    status,
                    statusClass
                };
            });

        tbody.innerHTML = activities.map((item) => `
            <tr>
                <td><strong>${item.type}</strong></td>
                <td>${item.pelanggan}</td>
                <td>${item.periode}</td>
                <td><small class="text-muted">${item.waktu}</small></td>
                <td><span class="badge ${item.statusClass}">${item.status}</span></td>
            </tr>
        `).join('');
        renderDashboardActivityPagination(activities.length);
    } catch (error) {
        console.error('Error loading recent activity:', error);
        const tbody = document.getElementById('activityTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Gagal memuat aktivitas</td></tr>';
        }
        dashboardActivityHasNextPage = false;
        renderDashboardActivityPagination(0);
    }
}
