// Laporan & Kroscek Page Functions (Admin Only)

const LAPORAN_MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const KROSCEK_PAGE_SIZE = 20;

let laporanBaseRows = [];
let laporanCurrentRows = [];
let laporanInstansiInfo = { nama_instansi: 'PAMSIMAS' };
const laporanChecklistState = {};
let kroscekCurrentRows = [];
let kroscekCurrentPage = 1;
let kroscekCurrentMeta = {
    bulan: new Date().getMonth() + 1,
    tahun: new Date().getFullYear(),
    hitungBerdasarkan: 'tercatat'
};

function escapeLaporanHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parseLaporanNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeLaporanText(value) {
    return String(value ?? '').trim();
}

function formatLaporanPeriode(bulan, tahun) {
    const monthName = LAPORAN_MONTHS[parseLaporanNumber(bulan, 1) - 1] || `Bulan ${bulan}`;
    return `${monthName} ${tahun}`;
}

function generateLaporanMonthOptions(currentMonth) {
    return LAPORAN_MONTHS.map((month, index) => {
        const monthNum = index + 1;
        return `<option value="${monthNum}" ${monthNum === currentMonth ? 'selected' : ''}>${month}</option>`;
    }).join('');
}

function generateLaporanYearOptions(currentYear, totalYears = 3) {
    const years = [];
    for (let i = 0; i < totalYears; i += 1) {
        years.push(currentYear - i);
    }
    return years.map((year) => `<option value="${year}">${year}</option>`).join('');
}

function getLaporanBadgeClass(status) {
    if (status === 'lunas' || status === 'dicatat') return 'badge-success';
    if (status === 'draft') return 'badge-warning';
    return 'badge-danger';
}

function normalizeLaporanItem(item) {
    const pembayaran = item?.pembayaran || null;
    const statusCatatRaw = String(item?.status_catat || 'draft').toLowerCase();
    const statusBayarRaw = String(
        pembayaran?.status_bayar ||
        item?.status_bayar ||
        (item?.pembayaran_id ? 'lunas' : 'belum')
    ).toLowerCase();

    const statusCatat = statusCatatRaw === 'dicatat' ? 'dicatat' : 'draft';
    const statusBayar = statusBayarRaw === 'lunas' ? 'lunas' : 'belum';
    const totalTagihan = parseLaporanNumber(pembayaran?.total_tagihan ?? item?.total_tagihan, 0);
    const biayaAdmin = parseLaporanNumber(pembayaran?.biaya_admin ?? item?.biaya_admin, 0);
    const biayaPetugas = parseLaporanNumber(pembayaran?.biaya_petugas ?? item?.biaya_petugas, 0);
    let biayaAir = parseLaporanNumber(pembayaran?.biaya_air ?? item?.biaya_air, 0);
    if (biayaAir === 0 && totalTagihan > 0) {
        biayaAir = Math.max(0, totalTagihan - biayaAdmin);
    }

    return {
        id: parseLaporanNumber(item?.id, 0),
        pelangganId: parseLaporanNumber(item?.pelanggan_id, 0),
        petugasId: parseLaporanNumber(item?.petugas?.id ?? item?.petugas_id, 0),
        pelangganKode: item?.pelanggan?.kode_pelanggan || item?.pelanggan_kode || '-',
        pelangganNama: item?.pelanggan?.nama || item?.pelanggan_nama || '-',
        alamat: sanitizeLaporanText(item?.pelanggan?.alamat || item?.alamat || item?.pelanggan_alamat || '-'),
        bulan: parseLaporanNumber(item?.bulan, 0),
        tahun: parseLaporanNumber(item?.tahun, 0),
        rt: sanitizeLaporanText(item?.pelanggan?.rt || item?.rt || item?.pelanggan_rt || '-'),
        rw: sanitizeLaporanText(item?.pelanggan?.rw || item?.rw || item?.pelanggan_rw || '-'),
        petugasNama: item?.petugas?.nama_lengkap || item?.petugas_nama || '-',
        meteranAwal: parseLaporanNumber(item?.meteran_awal),
        meteranAkhir: parseLaporanNumber(item?.meteran_akhir),
        pemakaian: parseLaporanNumber(item?.pemakaian),
        statusCatat,
        statusBayar,
        biayaAir,
        biayaAdmin,
        biayaPetugas,
        jumlahBulanBelumDicatat: parseLaporanNumber(item?.jumlah_bulan_belum_dicatat, 1),
        bulanBelumBayar: Array.isArray(item?.bulan_belum_bayar) ? item.bulan_belum_bayar : [],
        totalTagihan
    };
}

function normalizeLaporanPayload(raw, bulan, tahun) {
    const rows = Array.isArray(raw?.pencatatan)
        ? raw.pencatatan.map(normalizeLaporanItem)
        : [];

    const totalPelanggan = parseLaporanNumber(raw?.total_pelanggan, rows.length);
    const sudahDicatat = parseLaporanNumber(
        raw?.sudah_dicatat,
        rows.filter((item) => item.statusCatat === 'dicatat').length
    );
    const sudahLunas = parseLaporanNumber(
        raw?.sudah_lunas,
        rows.filter((item) => item.statusBayar === 'lunas').length
    );

    return {
        bulan: parseLaporanNumber(raw?.bulan, bulan),
        tahun: parseLaporanNumber(raw?.tahun, tahun),
        totalPelanggan,
        sudahDicatat,
        belumDicatat: parseLaporanNumber(raw?.belum_dicatat, Math.max(0, totalPelanggan - sudahDicatat)),
        sudahLunas,
        belumLunas: parseLaporanNumber(raw?.belum_lunas, Math.max(0, sudahDicatat - sudahLunas)),
        rows
    };
}

async function buildFallbackLaporanData(bulan, tahun) {
    const [allPelanggan, pencatatanList] = await Promise.all([
        API.pelanggan.list({ limit: 1000 }),
        API.pencatatan.list({ bulan, tahun, limit: 10000 })
    ]);

    const pelangganMap = new Map(
        (Array.isArray(allPelanggan) ? allPelanggan : []).map((item) => [item.id, item])
    );

    const activePelanggan = Array.isArray(allPelanggan)
        ? allPelanggan.filter((item) => item.status === 'aktif')
        : [];
    const rows = Array.isArray(pencatatanList) ? pencatatanList.map((item) => {
        const pelanggan = pelangganMap.get(item?.pelanggan_id) || {};
        return normalizeLaporanItem({
            ...item,
            pelanggan: {
                nama: pelanggan.nama,
                kode_pelanggan: pelanggan.kode_pelanggan,
                alamat: pelanggan.alamat,
                rt: pelanggan.rt,
                rw: pelanggan.rw
            }
        });
    }) : [];

    const totalPelanggan = activePelanggan.length;
    const sudahDicatat = rows.filter((item) => item.statusCatat === 'dicatat').length;
    const sudahLunas = rows.filter((item) => item.statusBayar === 'lunas').length;

    return {
        bulan,
        tahun,
        totalPelanggan,
        sudahDicatat,
        belumDicatat: Math.max(0, totalPelanggan - sudahDicatat),
        sudahLunas,
        belumLunas: Math.max(0, sudahDicatat - sudahLunas),
        rows
    };
}

function getLaporanFiltersFromForm() {
    return {
        search: sanitizeLaporanText(document.getElementById('searchLaporan')?.value).toLowerCase(),
        petugas: sanitizeLaporanText(document.getElementById('filterLaporanPetugas')?.value),
        rt: sanitizeLaporanText(document.getElementById('filterLaporanRt')?.value),
        rw: sanitizeLaporanText(document.getElementById('filterLaporanRw')?.value),
        status: sanitizeLaporanText(document.getElementById('filterLaporanStatus')?.value)
    };
}

function getLaporanSelectedPeriod() {
    const now = new Date();
    const bulan = parseLaporanNumber(document.getElementById('laporanBulan')?.value, now.getMonth() + 1);
    const tahun = parseLaporanNumber(document.getElementById('laporanTahun')?.value, now.getFullYear());
    return {
        bulan: String(bulan),
        tahun: String(tahun)
    };
}

function openLaporanKpiTarget(target) {
    const period = getLaporanSelectedPeriod();
    const rt = sanitizeLaporanText(document.getElementById('filterLaporanRt')?.value);
    const rw = sanitizeLaporanText(document.getElementById('filterLaporanRw')?.value);
    const search = sanitizeLaporanText(document.getElementById('searchLaporan')?.value);

    if (target === 'total-pelanggan') {
        window.PagePrefill?.set?.('pelanggan', {
            search,
            kategori: '',
            status: 'aktif',
            rt,
            rw
        });
        showPage('pelanggan');
        return;
    }

    if (target === 'sudah-dicatat' || target === 'belum-dicatat') {
        window.PagePrefill?.set?.('pencatatan', {
            bulan: period.bulan,
            tahun: period.tahun,
            rt,
            rw,
            status: target === 'sudah-dicatat' ? 'sudah' : 'belum',
            search
        });
        showPage('pencatatan');
        return;
    }

    if (target === 'belum-lunas') {
        window.PagePrefill?.set?.('pembayaran', {
            bulan: period.bulan,
            tahun: period.tahun,
            rt,
            rw,
            status: 'belum'
        });
        showPage('pembayaran');
    }
}

function handleLaporanKpiKeydown(event, target) {
    if (!event || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    openLaporanKpiTarget(target);
}

function formatLaporanAlamat(row) {
    const baseAddress = sanitizeLaporanText(row?.alamat);
    const rt = sanitizeLaporanText(row?.rt);
    const rw = sanitizeLaporanText(row?.rw);
    const hasRtRw = rt && rw && rt !== '-' && rw !== '-';

    if (!hasRtRw) return baseAddress || '-';
    if (!baseAddress || baseAddress === '-') return `RT${rt}/${rw}`;
    return `${baseAddress} RT${rt}/${rw}`;
}

function buildPeriodeAkumulasiList(bulan, tahun, count) {
    const total = Math.max(1, parseLaporanNumber(count, 1));
    if (total <= 1) return [];

    const months = [];
    let month = parseLaporanNumber(bulan, 1);
    let year = parseLaporanNumber(tahun, new Date().getFullYear());

    for (let i = 0; i < total; i += 1) {
        const label = LAPORAN_MONTHS[month - 1] || `Bulan ${month}`;
        months.unshift(`${label} ${year}`);
        month -= 1;
        if (month < 1) {
            month = 12;
            year -= 1;
        }
    }

    return months;
}

function formatLaporanPeriodeDetail(row) {
    const utama = formatLaporanPeriode(row?.bulan, row?.tahun);
    const sourceMonths = Array.isArray(row?.bulanBelumBayar)
        ? row.bulanBelumBayar.filter(Boolean)
        : [];

    const akumulasiList = sourceMonths.length > 1
        ? sourceMonths
        : buildPeriodeAkumulasiList(row?.bulan, row?.tahun, row?.jumlahBulanBelumDicatat);

    if (!akumulasiList || akumulasiList.length <= 1) {
        return utama;
    }

    const monthNames = akumulasiList
        .map((value) => sanitizeLaporanText(value).split(' ')[0])
        .map((value) => LAPORAN_MONTHS.find((monthName) => monthName.toLowerCase() === value.toLowerCase()) || value)
        .filter(Boolean);

    if (monthNames.length <= 1) {
        return utama;
    }

    const yearLabel = parseLaporanNumber(row?.tahun, new Date().getFullYear());
    return `${monthNames.join(', ')} ${yearLabel}`;
}

function getLaporanRowKey(row) {
    const pelangganId = parseLaporanNumber(row?.pelangganId, 0);
    const bulan = parseLaporanNumber(row?.bulan, 0);
    const tahun = parseLaporanNumber(row?.tahun, 0);
    const rowId = parseLaporanNumber(row?.id, 0);
    if (rowId > 0) return `catat-${rowId}`;
    return `${pelangganId}-${bulan}-${tahun}`;
}

function computeLaporanSummary(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const totalTagihanAir = safeRows.reduce((sum, row) => sum + parseLaporanNumber(row.biayaAir), 0);
    const totalAbonemen = safeRows.reduce((sum, row) => sum + parseLaporanNumber(row.biayaAdmin), 0);
    const totalJumlahBayar = safeRows.reduce((sum, row) => sum + parseLaporanNumber(row.totalTagihan), 0);
    const pendapatan = totalJumlahBayar;
    const totalKomisiPetugas = Math.round((totalAbonemen * 2000) / 3000);
    const totalBiayaSistem = Math.round((totalAbonemen * 1000) / 3000);
    const totalSaldoBersih = pendapatan - totalAbonemen;

    return {
        pendapatan,
        totalTagihanAir,
        totalAbonemen,
        totalKomisiPetugas,
        totalBiayaSistem,
        totalJumlahBayar,
        totalSaldoBersih
    };
}

function getLaporanFilterDescription() {
    const bulan = parseLaporanNumber(document.getElementById('laporanBulan')?.value, 0);
    const tahun = parseLaporanNumber(document.getElementById('laporanTahun')?.value, 0);
    const filters = getLaporanFiltersFromForm();
    const parts = [`Periode: ${formatLaporanPeriode(bulan, tahun)}`];

    if (filters.petugas) parts.push(`Petugas: ${filters.petugas}`);
    if (filters.rt) parts.push(`RT: ${filters.rt}`);
    if (filters.rw) parts.push(`RW: ${filters.rw}`);
    if (filters.status) parts.push(`Status: ${filters.status}`);
    if (filters.search) parts.push(`Pencarian: ${filters.search}`);

    return parts.join(' | ');
}

async function loadLaporanInstansiInfo() {
    try {
        const instansi = await API.pencatatan.getPengaturanInstansi();
        if (instansi && typeof instansi === 'object') {
            laporanInstansiInfo = {
                nama_instansi: instansi.nama_instansi || 'PAMSIMAS',
                alamat_instansi: instansi.alamat_instansi || '',
                no_telp_instansi: instansi.no_telp_instansi || ''
            };
        }
    } catch (error) {
        console.warn('Gagal memuat pengaturan instansi untuk laporan:', error);
    }
}

function toggleLaporanChecklist(rowKey, checked) {
    laporanChecklistState[rowKey] = !!checked;
}

function printLaporanA4() {
    const user = Config.getUser() || {};
    const summary = computeLaporanSummary(laporanCurrentRows);
    const filterDesc = getLaporanFilterDescription();
    const instansiNama = laporanInstansiInfo?.nama_instansi || 'PAMSIMAS';
    const tanggalCetak = new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    const petugasFilter = sanitizeLaporanText(document.getElementById('filterLaporanPetugas')?.value);
    const uniquePetugas = Array.from(new Set(
        (laporanCurrentRows || []).map((item) => sanitizeLaporanText(item.petugasNama)).filter(Boolean).filter((value) => value !== '-')
    ));
    const namaPetugasCetak = petugasFilter || (uniquePetugas.length > 0 ? uniquePetugas.join(', ') : '-');
    const namaPetugasTtd = petugasFilter || (uniquePetugas.length === 1 ? uniquePetugas[0] : '____________________');
    const namaAdminTtd = user.nama_lengkap || '____________________';

    const tableRows = (laporanCurrentRows || []).map((row, index) => {
        const periodeLabel = formatLaporanPeriodeDetail(row);
        const checkSymbol = laporanChecklistState[getLaporanRowKey(row)] ? '&#9745;' : '&#9744;';

        return `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>${escapeLaporanHtml(row.pelangganNama)}</td>
                <td>${escapeLaporanHtml(formatLaporanAlamat(row))}</td>
                <td>${escapeLaporanHtml(periodeLabel)}</td>
                <td class="text-center">${row.pemakaian} m3</td>
                <td class="text-center">${row.statusBayar}</td>
                <td class="text-right">${Utils.formatCurrency(row.biayaAir)}</td>
                <td class="text-right">${Utils.formatCurrency(row.biayaAdmin)}</td>
                <td class="text-right">${Utils.formatCurrency(row.totalTagihan)}</td>
                <td class="text-center">${checkSymbol}</td>
            </tr>
        `;
    }).join('');

    const printHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Laporan Ceklis Pembayaran</title>
    <style>
        @page { size: A4 portrait; margin: 12mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111827; }
        .header { text-align: center; margin-bottom: 10px; }
        .header h2 { margin: 0; font-size: 16px; text-transform: uppercase; }
        .header p { margin: 4px 0 0; font-size: 12px; }
        .meta { margin-bottom: 10px; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #111827; padding: 4px 6px; vertical-align: top; }
        th { background: #f3f4f6; text-align: center; font-size: 10px; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .totals { margin-top: 10px; width: 55%; }
        .totals td { border: none; padding: 2px 0; }
        .approval-wrap { margin-top: 24px; display: flex; justify-content: flex-end; }
        .approval { width: 360px; text-align: center; }
        .signatures { margin-top: 18px; display: flex; justify-content: space-between; gap: 16px; }
        .sign-box { width: 48%; text-align: center; }
        .sign-space { height: 58px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Laporan Ceklis Pembayaran</h2>
        <p>${escapeLaporanHtml(instansiNama)}</p>
    </div>

    <div class="meta">
        <div>${escapeLaporanHtml(filterDesc)}</div>
        <div>Nama Petugas: ${escapeLaporanHtml(namaPetugasCetak)}</div>
        <div>Tanggal Cetak: ${tanggalCetak}</div>
    </div>

    <table>
        <thead>
            <tr>
                <th>No</th>
                <th>Nama Pelanggan</th>
                <th>Alamat dan RT/RW</th>
                <th>Periode</th>
                <th>Pemakaian</th>
                <th>Status Pembayaran</th>
                <th>Biaya Pemakaian</th>
                <th>Biaya Admin</th>
                <th>Jumlah Bayar</th>
                <th>Ceklis</th>
            </tr>
        </thead>
        <tbody>
            ${tableRows || '<tr><td colspan="10" class="text-center">Tidak ada data</td></tr>'}
        </tbody>
    </table>

    <table class="totals">
        <tr><td><strong>Pendapatan</strong></td><td class="text-right">${Utils.formatCurrency(summary.pendapatan)}</td></tr>
        <tr><td><strong>Total Tagihan Air</strong></td><td class="text-right">${Utils.formatCurrency(summary.totalTagihanAir)}</td></tr>
        <tr><td><strong>Total Abondemen</strong></td><td class="text-right">${Utils.formatCurrency(summary.totalAbonemen)}</td></tr>
        <tr><td><strong>Komisi Petugas</strong></td><td class="text-right">${Utils.formatCurrency(summary.totalKomisiPetugas)}</td></tr>
        <tr><td><strong>Biaya Sistem</strong></td><td class="text-right">${Utils.formatCurrency(summary.totalBiayaSistem)}</td></tr>
        <tr><td><strong>Saldo Bersih</strong></td><td class="text-right"><strong>${Utils.formatCurrency(summary.totalSaldoBersih)}</strong></td></tr>
    </table>

    <div class="approval-wrap">
        <div class="approval">
            <div>${escapeLaporanHtml(instansiNama)}, ${tanggalCetak}</div>
            <div>Pengesahan Penerimaan Uang:</div>
            <div class="signatures">
                <div class="sign-box">
                    <div>Petugas</div>
                    <div class="sign-space"></div>
                    <div><strong>${escapeLaporanHtml(namaPetugasTtd)}</strong></div>
                </div>
                <div class="sign-box">
                    <div>Admin Instansi</div>
                    <div class="sign-space"></div>
                    <div><strong>${escapeLaporanHtml(namaAdminTtd)}</strong></div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    const printWindow = window.open('', '_blank', 'width=1024,height=768');
    if (!printWindow) {
        Utils.showToast('Popup diblokir browser. Izinkan popup untuk print.', 'error');
        return;
    }

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function populateLaporanFilterOptions(rows) {
    const petugasEl = document.getElementById('filterLaporanPetugas');
    const rtEl = document.getElementById('filterLaporanRt');
    const rwEl = document.getElementById('filterLaporanRw');
    if (!petugasEl || !rtEl || !rwEl) return;

    const currentPetugas = petugasEl.value;
    const currentRt = rtEl.value;
    const currentRw = rwEl.value;

    const uniquePetugas = Array.from(new Set(
        (rows || []).map((item) => sanitizeLaporanText(item.petugasNama)).filter(Boolean).filter((value) => value !== '-')
    )).sort((a, b) => a.localeCompare(b));
    const uniqueRt = Array.from(new Set(
        (rows || []).map((item) => sanitizeLaporanText(item.rt)).filter(Boolean).filter((value) => value !== '-')
    )).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const uniqueRw = Array.from(new Set(
        (rows || []).map((item) => sanitizeLaporanText(item.rw)).filter(Boolean).filter((value) => value !== '-')
    )).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    petugasEl.innerHTML = [
        '<option value="">Semua Petugas</option>',
        ...uniquePetugas.map((value) => `<option value="${escapeLaporanHtml(value)}">${escapeLaporanHtml(value)}</option>`)
    ].join('');
    rtEl.innerHTML = [
        '<option value="">Semua RT</option>',
        ...uniqueRt.map((value) => `<option value="${escapeLaporanHtml(value)}">${escapeLaporanHtml(value)}</option>`)
    ].join('');
    rwEl.innerHTML = [
        '<option value="">Semua RW</option>',
        ...uniqueRw.map((value) => `<option value="${escapeLaporanHtml(value)}">${escapeLaporanHtml(value)}</option>`)
    ].join('');

    petugasEl.value = uniquePetugas.includes(currentPetugas) ? currentPetugas : '';
    rtEl.value = uniqueRt.includes(currentRt) ? currentRt : '';
    rwEl.value = uniqueRw.includes(currentRw) ? currentRw : '';
}

function updateLaporanResultInfo(filteredCount, totalCount) {
    const infoEl = document.getElementById('laporanResultInfo');
    if (!infoEl) return;
    infoEl.textContent = `Menampilkan ${filteredCount} dari ${totalCount} data`;
}

function applyLaporanFilters() {
    const filters = getLaporanFiltersFromForm();
    const filteredRows = (laporanBaseRows || []).filter((row) => {
        if (filters.petugas && row.petugasNama !== filters.petugas) return false;
        if (filters.rt && sanitizeLaporanText(row.rt) !== filters.rt) return false;
        if (filters.rw && sanitizeLaporanText(row.rw) !== filters.rw) return false;

        if (filters.status && (row.statusBayar || 'belum') !== filters.status) return false;

        if (!filters.search) return true;

        const searchableText = [
            row.pelangganNama,
            row.pelangganKode,
            row.alamat,
            row.petugasNama,
            row.rt,
            row.rw
        ].join(' ').toLowerCase();

        return searchableText.includes(filters.search);
    });

    laporanCurrentRows = filteredRows;

    updateLaporanResultInfo(filteredRows.length, laporanBaseRows.length);
    renderLaporanTablePage();
}

function setupLaporanFilterEvents() {
    const searchEl = document.getElementById('searchLaporan');
    const ids = ['filterLaporanPetugas', 'filterLaporanRt', 'filterLaporanRw', 'filterLaporanStatus'];

    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => applyLaporanFilters());
        }
    });

    if (searchEl) {
        searchEl.addEventListener('input', () => applyLaporanFilters());
        searchEl.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                applyLaporanFilters();
            }
        });
    }
}

function renderLaporanTablePage() {
    const tbody = document.getElementById('laporanTableBody');
    if (!tbody) return;

    const pageRows = laporanCurrentRows;

    if (pageRows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">Tidak ada data periode ini</td></tr>';
        return;
    }

    tbody.innerHTML = pageRows.map((row, index) => {
        const nomor = index + 1;
        const periodeLabel = formatLaporanPeriodeDetail(row);
        const pemakaianLabel = `${row.pemakaian} m3`;
        const statusBayarLabel = row.statusBayar === 'lunas' ? 'lunas' : 'belum';
        const rowKey = getLaporanRowKey(row);
        const checked = laporanChecklistState[rowKey] ? 'checked' : '';

        return `
            <tr>
                <td>${nomor}</td>
                <td>
                    <strong>${escapeLaporanHtml(row.pelangganNama)}</strong>
                    <br>
                    <small class="text-muted">${escapeLaporanHtml(row.pelangganKode)}</small>
                </td>
                <td>${escapeLaporanHtml(formatLaporanAlamat(row))}</td>
                <td>${escapeLaporanHtml(periodeLabel)}</td>
                <td>${pemakaianLabel}</td>
                <td><span class="badge ${getLaporanBadgeClass(row.statusBayar)}">${statusBayarLabel}</span></td>
                <td>${Utils.formatCurrency(row.biayaAir)}</td>
                <td>${Utils.formatCurrency(row.biayaAdmin)}</td>
                <td><strong>${Utils.formatCurrency(row.totalTagihan)}</strong></td>
                <td class="text-center">
                    <input type="checkbox" class="laporan-checkbox" ${checked} onchange="toggleLaporanChecklist('${rowKey}', this.checked)">
                </td>
            </tr>
        `;
    }).join('');
}

function renderLaporanContent(data) {
    const contentDiv = document.getElementById('laporanContent');
    if (!contentDiv) return;

    laporanBaseRows = data.rows || [];
    laporanCurrentRows = [...laporanBaseRows];

    const periodeText = formatLaporanPeriode(data.bulan, data.tahun);
    const html = `
        <div class="stats-grid">
            <div class="stat-card laporan-kpi-card" role="button" tabindex="0" onclick="openLaporanKpiTarget('total-pelanggan')" onkeydown="handleLaporanKpiKeydown(event, 'total-pelanggan')">
                <h3>&#128203; Total Pelanggan</h3>
                <div class="value">${data.totalPelanggan}</div>
                <small class="text-white">Pelanggan aktif</small>
                <small class="text-white laporan-kpi-hint">Klik untuk buka halaman pelanggan</small>
            </div>
            <div class="stat-card success laporan-kpi-card" role="button" tabindex="0" onclick="openLaporanKpiTarget('sudah-dicatat')" onkeydown="handleLaporanKpiKeydown(event, 'sudah-dicatat')">
                <h3>&#9989; Sudah Dicatat</h3>
                <div class="value">${data.sudahDicatat}</div>
                <small class="text-white">Sudah input meteran</small>
                <small class="text-white laporan-kpi-hint">Klik untuk buka filter status sudah dicatat</small>
            </div>
            <div class="stat-card warning laporan-kpi-card" role="button" tabindex="0" onclick="openLaporanKpiTarget('belum-dicatat')" onkeydown="handleLaporanKpiKeydown(event, 'belum-dicatat')">
                <h3>&#9203; Belum Dicatat</h3>
                <div class="value">${data.belumDicatat}</div>
                <small class="text-white">Belum input meteran</small>
                <small class="text-white laporan-kpi-hint">Klik untuk buka filter status belum dicatat</small>
            </div>
            <div class="stat-card danger laporan-kpi-card" role="button" tabindex="0" onclick="openLaporanKpiTarget('belum-lunas')" onkeydown="handleLaporanKpiKeydown(event, 'belum-lunas')">
                <h3>&#10060; Belum Lunas</h3>
                <div class="value">${data.belumLunas}</div>
                <small class="text-white">Menunggu pembayaran</small>
                <small class="text-white laporan-kpi-hint">Klik untuk buka pembayaran belum lunas</small>
            </div>
        </div>

        <div class="card">
            <div class="card-header laporan-card-header">
                <div class="laporan-card-title">
                    <h3>&#128202; Detail Pencatatan</h3>
                    <small class="laporan-card-subtitle">Periode: ${periodeText}</small>
                    <small class="laporan-card-subtitle" id="laporanResultInfo">Menampilkan ${laporanCurrentRows.length} dari ${laporanCurrentRows.length} data</small>
                </div>
                <div class="laporan-card-actions">
                    <button class="btn btn-secondary btn-sm" onclick="printLaporanA4()">&#128424; Print A4</button>
                </div>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Nama Pelanggan</th>
                                <th>Alamat</th>
                                <th>Periode</th>
                                <th>Pemakaian</th>
                                <th>Status Pembayaran</th>
                                <th>Biaya Pemakaian</th>
                                <th>Biaya Admin</th>
                                <th>Jumlah Bayar</th>
                                <th>Ceklis</th>
                            </tr>
                        </thead>
                        <tbody id="laporanTableBody">
                            <tr><td colspan="10" class="text-center">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    contentDiv.innerHTML = html;
    populateLaporanFilterOptions(laporanBaseRows);
    applyLaporanFilters();
}

async function renderLaporanPage() {
    const contentWrapper = document.getElementById('contentWrapper');
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    contentWrapper.innerHTML = `
        <div class="page-content">
            <div class="page-header">
                <div class="page-title">
                    <h2>Laporan & Statistik</h2>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-body">
                    <div class="filter-bar laporan-filter-bar">
                        <div class="form-group laporan-filter-info">
                            <label>&#128221; Filter Laporan</label>
                            <small class="text-muted laporan-card-subtitle">Tampilkan data periode, lalu gunakan filter petugas/RT/RW/status/pencarian.</small>
                        </div>
                        <div class="form-group">
                            <label>&#128198; Bulan</label>
                            <select id="laporanBulan" class="form-control">
                                ${generateLaporanMonthOptions(currentMonth)}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>&#128467;&#65039; Tahun</label>
                            <select id="laporanTahun" class="form-control">
                                ${generateLaporanYearOptions(currentYear)}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>&#128269; Pencarian</label>
                            <input type="text" id="searchLaporan" class="form-control" placeholder="Nama/kode pelanggan, petugas, RT, RW">
                        </div>
                        <div class="form-group">
                            <label>Petugas</label>
                            <select id="filterLaporanPetugas" class="form-control">
                                <option value="">Semua Petugas</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>RT</label>
                            <select id="filterLaporanRt" class="form-control">
                                <option value="">Semua RT</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>RW</label>
                            <select id="filterLaporanRw" class="form-control">
                                <option value="">Semua RW</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select id="filterLaporanStatus" class="form-control">
                                <option value="">Semua Status</option>
                                <option value="lunas">Lunas</option>
                                <option value="belum">Belum</option>
                            </select>
                        </div>
                        <div class="form-group laporan-filter-actions">
                            <label>&nbsp;</label>
                            <div class="laporan-filter-buttons">
                                <button class="btn btn-secondary" onclick="loadLaporan()">&#128202; Tampilkan Data</button>
                                <button class="btn btn-primary" onclick="resetLaporanFilter()">&#128260; Reset</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="laporanContent"></div>
        </div>
    `;

    const tahunEl = document.getElementById('laporanTahun');
    if (tahunEl) tahunEl.value = String(currentYear);
    setupLaporanFilterEvents();

    await loadLaporan();
}

async function loadLaporan() {
    const bulan = parseLaporanNumber(document.getElementById('laporanBulan')?.value, new Date().getMonth() + 1);
    const tahun = parseLaporanNumber(document.getElementById('laporanTahun')?.value, new Date().getFullYear());

    try {
        Utils.showLoading();
        await loadLaporanInstansiInfo();
        const rawLaporan = await API.pencatatan.getLaporanBulanan(bulan, tahun);
        const normalizedLaporan = normalizeLaporanPayload(rawLaporan, bulan, tahun);
        Object.keys(laporanChecklistState).forEach((key) => delete laporanChecklistState[key]);
        renderLaporanContent(normalizedLaporan);
    } catch (error) {
        console.error('Error loading laporan endpoint, using fallback:', error);
        try {
            const fallbackLaporan = await buildFallbackLaporanData(bulan, tahun);
            Object.keys(laporanChecklistState).forEach((key) => delete laporanChecklistState[key]);
            renderLaporanContent(fallbackLaporan);
            Utils.showToast('Endpoint laporan bermasalah, data dimuat dari fallback.', 'error');
        } catch (fallbackError) {
            console.error('Error loading fallback laporan:', fallbackError);
            Utils.showToast('Gagal memuat laporan: ' + fallbackError.message, 'error');
        }
    } finally {
        Utils.hideLoading();
    }
}

async function resetLaporanFilter() {
    const now = new Date();
    const bulanEl = document.getElementById('laporanBulan');
    const tahunEl = document.getElementById('laporanTahun');
    const searchEl = document.getElementById('searchLaporan');
    const petugasEl = document.getElementById('filterLaporanPetugas');
    const rtEl = document.getElementById('filterLaporanRt');
    const rwEl = document.getElementById('filterLaporanRw');
    const statusEl = document.getElementById('filterLaporanStatus');

    if (bulanEl) bulanEl.value = String(now.getMonth() + 1);
    if (tahunEl) tahunEl.value = String(now.getFullYear());
    if (searchEl) searchEl.value = '';
    if (petugasEl) petugasEl.value = '';
    if (rtEl) rtEl.value = '';
    if (rwEl) rwEl.value = '';
    if (statusEl) statusEl.value = '';
    await loadLaporan();
}

function normalizeKroscekList(rekapList, hitungBerdasarkan = 'tercatat') {
    if (!Array.isArray(rekapList)) return [];

    return rekapList.map((item) => {
        const petugasId = parseLaporanNumber(item?.petugas_id ?? item?.petugasId, 0);
        const totalPelanggan = parseLaporanNumber(item?.total_pelanggan ?? item?.totalPelanggan ?? item?.jumlah_pelanggan, 0);
        let sudahDicatat = parseLaporanNumber(item?.sudah_dicatat ?? item?.sudahDicatat, 0);
        let sudahLunas = parseLaporanNumber(item?.sudah_lunas ?? item?.sudahLunas, 0);

        if (sudahDicatat === 0 && parseLaporanNumber(item?.jumlah_pelanggan, 0) > 0 && hitungBerdasarkan !== 'lunas') {
            sudahDicatat = parseLaporanNumber(item?.jumlah_pelanggan, 0);
        }
        if (sudahLunas === 0 && parseLaporanNumber(item?.jumlah_pelanggan, 0) > 0 && hitungBerdasarkan === 'lunas') {
            sudahLunas = parseLaporanNumber(item?.jumlah_pelanggan, 0);
        }

        let totalKomisi = parseLaporanNumber(item?.total_komisi ?? item?.totalKomisi ?? item?.total_gaji);
        let totalAbonemen = parseLaporanNumber(item?.total_abonemen ?? item?.totalAbonemen);
        if (totalAbonemen === 0 && totalKomisi > 0) {
            totalAbonemen = Math.round((totalKomisi * 3000) / 2000);
        }
        if (totalKomisi === 0 && totalAbonemen > 0) {
            totalKomisi = getKomisiDariAbonemen(totalAbonemen);
        }

        const totalBiayaSistem = parseLaporanNumber(
            item?.total_biaya_sistem ?? item?.totalBiayaSistem,
            Math.max(0, totalAbonemen - totalKomisi)
        );
        const belumDicatat = Math.max(0, totalPelanggan - sudahDicatat);
        const dasarHitungJumlah = hitungBerdasarkan === 'lunas' ? sudahLunas : sudahDicatat;

        return {
            petugasId,
            petugasNama: item?.petugas_nama || item?.petugasNama || 'Tanpa Petugas',
            totalPelanggan,
            sudahDicatat,
            belumDicatat,
            sudahLunas,
            dasarHitungJumlah,
            totalAbonemen,
            totalKomisi,
            totalBiayaSistem,
            jumlahGaji: totalKomisi
        };
    });
}

function getKomisiDariAbonemen(totalAbonemen) {
    return Math.round((parseLaporanNumber(totalAbonemen) * 2000) / 3000);
}

function buildKroscekPetugasKey(petugasId, petugasNama) {
    const id = parseLaporanNumber(petugasId, 0);
    if (id > 0) return `id:${id}`;
    const safeName = sanitizeLaporanText(petugasNama).toUpperCase() || 'TANPA PETUGAS';
    return `name:${safeName}`;
}

function buildKroscekRowsFromLaporanRows({ laporanRows, petugasList, activePelanggan, hitungBerdasarkan }) {
    const rows = Array.isArray(laporanRows) ? laporanRows : [];
    const users = Array.isArray(petugasList) ? petugasList : [];
    const pelangganAktif = Array.isArray(activePelanggan) ? activePelanggan : [];
    const map = new Map();

    const ensureRow = (petugasId, petugasNama) => {
        const normalizedName = sanitizeLaporanText(petugasNama);
        const id = parseLaporanNumber(petugasId, 0);
        const key = buildKroscekPetugasKey(id, normalizedName);

        if (!map.has(key)) {
            map.set(key, {
                key,
                petugasId: id,
                petugasNama: normalizedName && normalizedName !== '-' ? normalizedName : 'Tanpa Petugas',
                totalPelanggan: 0,
                sudahDicatatSet: new Set(),
                sudahLunasSet: new Set(),
                totalAbonemen: 0
            });
        }

        const target = map.get(key);
        if ((!target.petugasNama || target.petugasNama === 'Tanpa Petugas') && normalizedName && normalizedName !== '-') {
            target.petugasNama = normalizedName;
        }
        if (target.petugasId <= 0 && id > 0) {
            target.petugasId = id;
        }
        return target;
    };

    users.forEach((petugas) => {
        ensureRow(petugas?.id, petugas?.nama_lengkap);
    });

    pelangganAktif.forEach((pelanggan) => {
        const target = ensureRow(pelanggan?.petugas_id, pelanggan?.petugas_nama);
        target.totalPelanggan += 1;
    });

    rows.forEach((row) => {
        const target = ensureRow(row?.petugasId, row?.petugasNama);
        const pelangganId = parseLaporanNumber(row?.pelangganId, 0);
        const statusCatat = sanitizeLaporanText(row?.statusCatat || 'draft').toLowerCase();
        const statusBayar = sanitizeLaporanText(row?.statusBayar || 'belum').toLowerCase();

        if (statusCatat === 'dicatat' && pelangganId > 0) target.sudahDicatatSet.add(pelangganId);
        if (statusBayar === 'lunas' && pelangganId > 0) target.sudahLunasSet.add(pelangganId);

        const isMasukDasarHitung = hitungBerdasarkan === 'lunas'
            ? statusBayar === 'lunas'
            : statusCatat === 'dicatat';
        if (!isMasukDasarHitung) return;

        target.totalAbonemen += parseLaporanNumber(row?.biayaAdmin, 0);
    });

    return Array.from(map.values())
        .map((item) => {
            const sudahDicatat = item.sudahDicatatSet.size;
            const sudahLunas = item.sudahLunasSet.size;
            const belumDicatat = Math.max(0, item.totalPelanggan - sudahDicatat);
            const dasarHitungJumlah = hitungBerdasarkan === 'lunas' ? sudahLunas : sudahDicatat;
            let totalAbonemen = item.totalAbonemen;
            if (totalAbonemen === 0 && dasarHitungJumlah > 0) {
                totalAbonemen = dasarHitungJumlah * 3000;
            }
            const totalKomisi = getKomisiDariAbonemen(totalAbonemen);
            const totalBiayaSistem = Math.max(0, totalAbonemen - totalKomisi);

            return {
                petugasId: item.petugasId,
                petugasNama: item.petugasNama,
                totalPelanggan: item.totalPelanggan,
                sudahDicatat,
                belumDicatat,
                sudahLunas,
                dasarHitungJumlah,
                totalAbonemen,
                totalKomisi,
                totalBiayaSistem,
                jumlahGaji: totalKomisi
            };
        })
        .sort((a, b) => a.petugasNama.localeCompare(b.petugasNama));
}

async function buildFallbackKroscekData(bulan, tahun, hitungBerdasarkan) {
    const [petugasList, pelangganAktif, pembayaranList] = await Promise.all([
        API.admin.users.list('petugas'),
        API.pelanggan.list({ status: 'aktif', limit: 10000 }),
        API.pembayaran.list({ bulan, tahun, limit: 10000 })
    ]);

    const users = Array.isArray(petugasList) ? petugasList : [];
    const aktifList = Array.isArray(pelangganAktif) ? pelangganAktif : [];
    const pembayaran = Array.isArray(pembayaranList) ? pembayaranList : [];
    const map = new Map();

    const ensureRow = (petugasId, petugasNama) => {
        const key = buildKroscekPetugasKey(petugasId, petugasNama);
        if (!map.has(key)) {
            map.set(key, {
                petugasId: parseLaporanNumber(petugasId, 0),
                petugasNama: sanitizeLaporanText(petugasNama) || 'Tanpa Petugas',
                totalPelanggan: 0,
                sudahDicatatSet: new Set(),
                sudahLunasSet: new Set(),
                totalAbonemen: 0
            });
        }
        return map.get(key);
    };

    users.forEach((petugas) => ensureRow(petugas?.id, petugas?.nama_lengkap));
    aktifList.forEach((pelanggan) => {
        ensureRow(pelanggan?.petugas_id, pelanggan?.petugas_nama).totalPelanggan += 1;
    });

    pembayaran.forEach((item) => {
        const target = ensureRow(item?.petugas_id, item?.petugas_nama);
        const pelangganId = parseLaporanNumber(item?.pelanggan_id, 0);
        const statusBayar = sanitizeLaporanText(item?.status_bayar || 'belum').toLowerCase();

        if (pelangganId > 0) {
            target.sudahDicatatSet.add(pelangganId);
            if (statusBayar === 'lunas') target.sudahLunasSet.add(pelangganId);
        }

        const masukDasar = hitungBerdasarkan === 'lunas' ? statusBayar === 'lunas' : true;
        if (masukDasar) {
            target.totalAbonemen += parseLaporanNumber(item?.biaya_admin, 3000);
        }
    });

    return Array.from(map.values())
        .map((item) => {
            const sudahDicatat = item.sudahDicatatSet.size;
            const sudahLunas = item.sudahLunasSet.size;
            const belumDicatat = Math.max(0, item.totalPelanggan - sudahDicatat);
            const dasarHitungJumlah = hitungBerdasarkan === 'lunas' ? sudahLunas : sudahDicatat;
            const totalAbonemen = item.totalAbonemen || (dasarHitungJumlah * 3000);
            const totalKomisi = getKomisiDariAbonemen(totalAbonemen);
            const totalBiayaSistem = Math.max(0, totalAbonemen - totalKomisi);

            return {
                petugasId: item.petugasId,
                petugasNama: item.petugasNama,
                totalPelanggan: item.totalPelanggan,
                sudahDicatat,
                belumDicatat,
                sudahLunas,
                dasarHitungJumlah,
                totalAbonemen,
                totalKomisi,
                totalBiayaSistem,
                jumlahGaji: totalKomisi
            };
        })
        .sort((a, b) => a.petugasNama.localeCompare(b.petugasNama));
}

function renderKroscekTablePage() {
    const tbody = document.getElementById('kroscekTableBody');
    if (!tbody) return;

    const start = (kroscekCurrentPage - 1) * KROSCEK_PAGE_SIZE;
    const pageRows = kroscekCurrentRows.slice(start, start + KROSCEK_PAGE_SIZE);
    const dasarLabel = kroscekCurrentMeta.hitungBerdasarkan === 'lunas' ? 'Lunas' : 'Dicatat';

    if (pageRows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Tidak ada data slip gaji</td></tr>';
        return;
    }

    tbody.innerHTML = pageRows.map((row, index) => {
        const globalIndex = start + index;
        return `
            <tr>
                <td class="text-center">${globalIndex + 1}</td>
                <td>
                    <strong>${escapeLaporanHtml(row.petugasNama)}</strong><br>
                    <small class="text-muted">Abondemen: ${Utils.formatCurrency(row.totalAbonemen)} &#183; Sistem: ${Utils.formatCurrency(row.totalBiayaSistem)}</small>
                </td>
                <td class="text-center">${row.totalPelanggan}</td>
                <td class="text-center">${row.sudahDicatat}</td>
                <td class="text-center">${row.belumDicatat}</td>
                <td class="text-center">${row.dasarHitungJumlah} ${dasarLabel}</td>
                <td class="text-right"><strong>${Utils.formatCurrency(row.jumlahGaji)}</strong></td>
                <td class="text-center">
                    <button class="btn btn-secondary btn-sm" onclick="printSlipGajiPetugas(${globalIndex})">&#128424; Print Slip</button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderKroscekPagination() {
    const container = document.getElementById('kroscekPagination');
    if (!container) return;

    const totalData = kroscekCurrentRows.length;
    const totalPages = Math.max(1, Math.ceil(totalData / KROSCEK_PAGE_SIZE));
    const canPrev = kroscekCurrentPage > 1;
    const canNext = kroscekCurrentPage < totalPages;

    container.innerHTML = `
        <div class="pagination-row">
            <small class="text-muted">Halaman ${kroscekCurrentPage} dari ${totalPages} (${totalData} data)</small>
            <div class="pagination-actions">
                <button class="btn btn-secondary btn-sm" onclick="goToPrevKroscekPage()" ${canPrev ? '' : 'disabled'}>&#11013;&#65039; Sebelumnya</button>
                <button class="btn btn-secondary btn-sm" onclick="goToNextKroscekPage()" ${canNext ? '' : 'disabled'}>Berikutnya &#10145;&#65039;</button>
            </div>
        </div>
    `;
}

function goToPrevKroscekPage() {
    if (kroscekCurrentPage <= 1) return;
    kroscekCurrentPage -= 1;
    renderKroscekTablePage();
    renderKroscekPagination();
}

function goToNextKroscekPage() {
    const totalPages = Math.max(1, Math.ceil(kroscekCurrentRows.length / KROSCEK_PAGE_SIZE));
    if (kroscekCurrentPage >= totalPages) return;
    kroscekCurrentPage += 1;
    renderKroscekTablePage();
    renderKroscekPagination();
}

function printSlipGajiPetugas(rowIndex) {
    const index = parseLaporanNumber(rowIndex, -1);
    const row = kroscekCurrentRows[index];
    if (!row) {
        Utils.showToast('Data slip gaji tidak ditemukan.', 'error');
        return;
    }

    const user = Config.getUser() || {};
    const bulan = parseLaporanNumber(kroscekCurrentMeta.bulan, new Date().getMonth() + 1);
    const tahun = parseLaporanNumber(kroscekCurrentMeta.tahun, new Date().getFullYear());
    const hitungBerdasarkan = sanitizeLaporanText(kroscekCurrentMeta.hitungBerdasarkan || 'tercatat');
    const hitungLabel = hitungBerdasarkan === 'lunas' ? 'Sudah Lunas' : 'Sudah Dicatat';
    const periodeLabel = formatLaporanPeriode(bulan, tahun);
    const tanggalCetak = new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    const slipNumber = `SG-${tahun}${String(bulan).padStart(2, '0')}-${String(index + 1).padStart(3, '0')}`;
    const instansiNama = laporanInstansiInfo?.nama_instansi || 'PAMSIMAS';
    const namaAdmin = user.nama_lengkap || '____________________';

    const printHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Slip Gaji Petugas</title>
    <style>
        @page { size: A4 portrait; margin: 14mm; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111827; }
        .header { text-align: center; margin-bottom: 16px; }
        .header h2 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.4px; }
        .header p { margin: 4px 0 0; font-size: 12px; }
        .meta, .detail, .calc { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .meta td, .detail td, .calc td, .calc th { border: 1px solid #111827; padding: 6px 8px; }
        .meta td:first-child, .detail td:first-child { width: 220px; background: #f9fafb; }
        .calc th { background: #f3f4f6; text-align: left; }
        .text-right { text-align: right; }
        .summary { font-size: 13px; font-weight: 700; }
        .signature-wrap { margin-top: 28px; display: flex; justify-content: flex-end; }
        .signature { width: 360px; text-align: center; }
        .sign-row { margin-top: 14px; display: flex; justify-content: space-between; gap: 18px; }
        .sign-box { width: 48%; text-align: center; }
        .sign-space { height: 70px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Slip Gaji Petugas</h2>
        <p>${escapeLaporanHtml(instansiNama)}</p>
    </div>

    <table class="meta">
        <tr><td>Nomor Slip</td><td>${escapeLaporanHtml(slipNumber)}</td></tr>
        <tr><td>Periode</td><td>${escapeLaporanHtml(periodeLabel)}</td></tr>
        <tr><td>Nama Petugas</td><td><strong>${escapeLaporanHtml(row.petugasNama)}</strong></td></tr>
        <tr><td>Dasar Perhitungan</td><td>${escapeLaporanHtml(hitungLabel)}</td></tr>
    </table>

    <table class="detail">
        <tr><td>Total Pelanggan Tanggung Jawab</td><td>${row.totalPelanggan}</td></tr>
        <tr><td>Sudah Dicatat</td><td>${row.sudahDicatat}</td></tr>
        <tr><td>Belum Dicatat</td><td>${row.belumDicatat}</td></tr>
        <tr><td>Sudah Lunas</td><td>${row.sudahLunas}</td></tr>
        <tr><td>Jumlah Dasar Dihitung (${escapeLaporanHtml(hitungLabel)})</td><td>${row.dasarHitungJumlah}</td></tr>
    </table>

    <table class="calc">
        <thead>
            <tr>
                <th>Komponen Perhitungan</th>
                <th class="text-right">Nilai</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Total Abondemen Dasar</td>
                <td class="text-right">${Utils.formatCurrency(row.totalAbonemen)}</td>
            </tr>
            <tr>
                <td>Komisi Petugas (2.000 dari 3.000)</td>
                <td class="text-right">${Utils.formatCurrency(row.totalKomisi)}</td>
            </tr>
            <tr>
                <td>Biaya Sistem (1.000 dari 3.000)</td>
                <td class="text-right">${Utils.formatCurrency(row.totalBiayaSistem)}</td>
            </tr>
            <tr class="summary">
                <td>Jumlah Gaji Diterima</td>
                <td class="text-right">${Utils.formatCurrency(row.jumlahGaji)}</td>
            </tr>
        </tbody>
    </table>

    <div class="signature-wrap">
        <div class="signature">
            <div>${escapeLaporanHtml(instansiNama)}, ${tanggalCetak}</div>
            <div class="sign-row">
                <div class="sign-box">
                    <div>Petugas</div>
                    <div class="sign-space"></div>
                    <div><strong>${escapeLaporanHtml(row.petugasNama)}</strong></div>
                </div>
                <div class="sign-box">
                    <div>Admin Instansi</div>
                    <div class="sign-space"></div>
                    <div><strong>${escapeLaporanHtml(namaAdmin)}</strong></div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    const printWindow = window.open('', '_blank', 'width=1024,height=768');
    if (!printWindow) {
        Utils.showToast('Popup diblokir browser. Izinkan popup untuk print.', 'error');
        return;
    }

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function renderKroscekContent(rekapList, bulan, tahun, hitungBerdasarkan) {
    const contentDiv = document.getElementById('kroscekContent');
    if (!contentDiv) return;

    kroscekCurrentRows = normalizeKroscekList(rekapList, hitungBerdasarkan);
    kroscekCurrentPage = 1;
    kroscekCurrentMeta = { bulan, tahun, hitungBerdasarkan };

    const totalPetugas = kroscekCurrentRows.length;
    const totalPelanggan = kroscekCurrentRows.reduce((sum, row) => sum + row.totalPelanggan, 0);
    const totalSudahDicatat = kroscekCurrentRows.reduce((sum, row) => sum + row.sudahDicatat, 0);
    const totalBelumDicatat = kroscekCurrentRows.reduce((sum, row) => sum + row.belumDicatat, 0);
    const totalDasarHitung = kroscekCurrentRows.reduce((sum, row) => sum + row.dasarHitungJumlah, 0);
    const totalGaji = kroscekCurrentRows.reduce((sum, row) => sum + row.jumlahGaji, 0);
    const periodeText = formatLaporanPeriode(bulan, tahun);
    const hitungLabel = hitungBerdasarkan === 'lunas' ? 'Sudah Lunas' : 'Sudah Dicatat';

    contentDiv.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <h3>&#128101; Total Petugas</h3>
                <div class="value">${totalPetugas}</div>
                <small class="text-white">Petugas dalam rekap periode ini</small>
            </div>
            <div class="stat-card info">
                <h3>&#128203; Total Pelanggan Aktif</h3>
                <div class="value">${totalPelanggan}</div>
                <small class="text-white">Sudah dicatat: ${totalSudahDicatat} &#183; Belum: ${totalBelumDicatat}</small>
            </div>
            <div class="stat-card warning">
                <h3>&#129534; Dasar Hitung</h3>
                <div class="value">${totalDasarHitung}</div>
                <small class="text-white">${hitungLabel}</small>
            </div>
            <div class="stat-card success">
                <h3>&#128176; Total Gaji Komisi</h3>
                <div class="value">${Utils.formatCurrency(totalGaji)}</div>
                <small class="text-white">Periode ${periodeText}</small>
            </div>
        </div>

        <div class="card">
            <div class="card-header laporan-card-header">
                <div class="laporan-card-title">
                    <h3>&#129534; Daftar Slip Gaji Petugas</h3>
                    <small class="laporan-card-subtitle">Periode: ${periodeText} &#183; Hitung: ${hitungLabel}</small>
                    <small class="laporan-card-subtitle">Menampilkan ${kroscekCurrentRows.length} data petugas</small>
                </div>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Petugas</th>
                                <th>Total Pelanggan</th>
                                <th>Sudah Dicatat</th>
                                <th>Belum Dicatat</th>
                                <th>Dasar Hitung</th>
                                <th>Jumlah Gaji</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="kroscekTableBody">
                            <tr><td colspan="8" class="text-center">Loading...</td></tr>
                        </tbody>
                        <tfoot>
                            <tr class="laporan-total-row">
                                <td class="text-center">-</td>
                                <td>TOTAL</td>
                                <td class="text-center">${totalPelanggan}</td>
                                <td class="text-center">${totalSudahDicatat}</td>
                                <td class="text-center">${totalBelumDicatat}</td>
                                <td class="text-center">${totalDasarHitung}</td>
                                <td class="text-right">${Utils.formatCurrency(totalGaji)}</td>
                                <td class="text-center">-</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div id="kroscekPagination"></div>
            </div>
        </div>
    `;

    renderKroscekTablePage();
    renderKroscekPagination();
}

async function renderKroscekPage() {
    const contentWrapper = document.getElementById('contentWrapper');
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    contentWrapper.innerHTML = `
        <div class="page-content">
            <div class="page-header">
                <div class="page-title">
                    <h2>Slip Gaji Petugas</h2>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-body">
                    <div class="filter-bar laporan-filter-bar">
                        <div class="form-group laporan-filter-info">
                            <label>&#128269; Filter Slip Gaji</label>
                            <small class="text-muted laporan-card-subtitle">Hitung slip berdasarkan status pilihan.</small>
                        </div>
                        <div class="form-group">
                            <label>&#128198; Bulan</label>
                            <select id="kroscekBulan" class="form-control">
                                ${generateLaporanMonthOptions(currentMonth)}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>&#128467;&#65039; Tahun</label>
                            <select id="kroscekTahun" class="form-control">
                                ${generateLaporanYearOptions(currentYear)}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>&#129534; Hitung Berdasarkan</label>
                            <select id="hitungBerdasarkan" class="form-control">
                                <option value="tercatat">Sudah Dicatat</option>
                                <option value="lunas">Sudah Lunas</option>
                            </select>
                        </div>
                        <div class="form-group laporan-filter-actions">
                            <label>&nbsp;</label>
                            <div class="laporan-filter-buttons">
                                <button class="btn btn-secondary" onclick="loadKroscek()">&#128202; Tampilkan Slip</button>
                                <button class="btn btn-primary" onclick="resetKroscekFilter()">&#128260; Reset</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="kroscekContent"></div>
        </div>
    `;

    const tahunEl = document.getElementById('kroscekTahun');
    if (tahunEl) tahunEl.value = String(currentYear);

    await loadKroscek();
}

async function loadKroscek() {
    const bulan = parseLaporanNumber(document.getElementById('kroscekBulan')?.value, new Date().getMonth() + 1);
    const tahun = parseLaporanNumber(document.getElementById('kroscekTahun')?.value, new Date().getFullYear());
    const hitungBerdasarkan = document.getElementById('hitungBerdasarkan')?.value || 'tercatat';

    try {
        Utils.showLoading();
        await loadLaporanInstansiInfo();
        const rawLaporan = await API.pencatatan.getLaporanBulanan(bulan, tahun);
        const normalizedLaporan = normalizeLaporanPayload(rawLaporan, bulan, tahun);
        const [petugasList, pelangganAktif] = await Promise.all([
            API.admin.users.list('petugas'),
            API.pelanggan.list({ status: 'aktif', limit: 10000 })
        ]);
        const rekapList = buildKroscekRowsFromLaporanRows({
            laporanRows: normalizedLaporan.rows,
            petugasList,
            activePelanggan: pelangganAktif,
            hitungBerdasarkan
        });
        renderKroscekContent(rekapList, bulan, tahun, hitungBerdasarkan);
    } catch (error) {
        console.error('Error loading slip gaji from laporan endpoint, using fallback:', error);
        try {
            const rekapList = await API.pembayaran.getRekapAllPetugas(bulan, tahun, hitungBerdasarkan);
            renderKroscekContent(rekapList, bulan, tahun, hitungBerdasarkan);
            Utils.showToast('Data slip gaji dimuat dari endpoint rekap cadangan.', 'error');
        } catch (rekapError) {
            console.error('Error loading fallback rekap endpoint, using local fallback:', rekapError);
            try {
                const fallbackList = await buildFallbackKroscekData(bulan, tahun, hitungBerdasarkan);
                renderKroscekContent(fallbackList, bulan, tahun, hitungBerdasarkan);
                Utils.showToast('Endpoint slip gaji bermasalah, data dimuat dari fallback lokal.', 'error');
            } catch (fallbackError) {
                console.error('Error loading fallback slip gaji:', fallbackError);
                Utils.showToast('Gagal memuat slip gaji: ' + fallbackError.message, 'error');
            }
        }
    } finally {
        Utils.hideLoading();
    }
}

async function resetKroscekFilter() {
    const now = new Date();
    const bulanEl = document.getElementById('kroscekBulan');
    const tahunEl = document.getElementById('kroscekTahun');
    const hitungEl = document.getElementById('hitungBerdasarkan');

    if (bulanEl) bulanEl.value = String(now.getMonth() + 1);
    if (tahunEl) tahunEl.value = String(now.getFullYear());
    if (hitungEl) hitungEl.value = 'tercatat';

    await loadKroscek();
}
