// Admin Pages Functions (Tarif, Pengaturan, Users)

// ==================== TARIF ====================
async function renderTarifPage() {
    const contentWrapper = document.getElementById('contentWrapper');

    const html = `
        <div class="page-content">
            <div class="page-header">
                <div class="page-title">
                    <h2>Kelola Tarif</h2>
                </div>
                <div class="page-actions">
                    <button class="btn btn-primary" onclick="showAddTarifModal()">➕ Tambah Tarif</button>
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Kategori</th>
                                    <th>Range (m³)</th>
                                    <th>Harga/m³</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="tarifTableBody">
                                <tr><td colspan="5" class="text-center">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    contentWrapper.innerHTML = html;
    await loadTarif();
}

async function loadTarif() {
    try {
        const tarifList = await API.admin.tarif.list();
        renderTarifTable(tarifList);
    } catch (error) {
        Utils.showToast('Gagal memuat tarif: ' + error.message, 'error');
    }
}

function renderTarifTable(tarifList) {
    const tbody = document.getElementById('tarifTableBody');

    if (!tarifList || tarifList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada data tarif</td></tr>';
        return;
    }

    tbody.innerHTML = tarifList.map(t => `
        <tr>
            <td><span class="badge badge-${t.kategori === 'personal' ? 'primary' : 'warning'}">${t.kategori}</span></td>
            <td>${t.batas_bawah} - ${t.batas_atas} m³</td>
            <td>${Utils.formatCurrency(t.harga_per_m3)}</td>
            <td><span class="badge badge-${t.aktif ? 'success' : 'danger'}">${t.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editTarif(${t.id})">✏️</button>
                ${t.aktif ? `<button class="btn btn-sm btn-danger" onclick="hapusTarif(${t.id})">🗑️</button>` : ''}
            </td>
        </tr>
    `).join('');
}

function showAddTarifModal() {
    const content = `
        <form id="addTarifForm">
            <div class="form-group">
                <label class="required">Kategori</label>
                <select name="kategori" class="form-control" required>
                    <option value="personal">Personal</option>
                    <option value="bisnis">Bisnis</option>
                </select>
            </div>
            <div class="form-group">
                <label class="required">Batas Bawah (m³)</label>
                <input type="number" name="batas_bawah" class="form-control" min="0" required>
            </div>
            <div class="form-group">
                <label class="required">Batas Atas (m³)</label>
                <input type="number" name="batas_atas" class="form-control" min="1" required>
            </div>
            <div class="form-group">
                <label class="required">Harga per m³</label>
                <input type="number" name="harga" class="form-control" min="0" step="0.01" required>
            </div>
            <div class="form-group">
                <button type="submit" class="btn btn-primary btn-block">💾 Simpan Tarif</button>
            </div>
        </form>
    `;

    Utils.showModal('Tambah Tarif', content);
    document.getElementById('addTarifForm').addEventListener('submit', handleAddTarif);
}

async function handleAddTarif(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
        Utils.showLoading();
        await API.admin.tarif.create({
            kategori: formData.get('kategori'),
            batas_bawah: parseInt(formData.get('batas_bawah')),
            batas_atas: parseInt(formData.get('batas_atas')),
            harga_per_m3: parseFloat(formData.get('harga'))
        });

        Utils.hideLoading();
        Utils.hideModal();
        Utils.showToast('Tarif berhasil ditambahkan!', 'success');
        await loadTarif();
    } catch (error) {
        Utils.hideLoading();
        Utils.showToast('Gagal menambah tarif: ' + error.message, 'error');
    }
}

async function editTarif(id) {
    try {
        const tarif = await API.admin.tarif.list();
        const targetTarif = tarif.find(t => t.id === id);

        if (!targetTarif) {
            Utils.showToast('Tarif tidak ditemukan', 'error');
            return;
        }

        const content = `
            <form id="editTarifForm">
                <input type="hidden" name="id" value="${targetTarif.id}">
                <div class="form-group">
                    <label>Kategori</label>
                    <input type="text" class="form-control" value="${targetTarif.kategori}" disabled>
                </div>
                <div class="form-group">
                    <label>Range</label>
                    <input type="text" class="form-control" value="${targetTarif.batas_bawah} - ${targetTarif.batas_atas} m³" disabled>
                </div>
                <div class="form-group">
                    <label class="required">Harga per m³</label>
                    <input type="number" name="harga" class="form-control" value="${targetTarif.harga_per_m3}" min="0" step="0.01" required>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="aktif" class="form-control">
                        <option value="true" ${targetTarif.aktif ? 'selected' : ''}>Aktif</option>
                        <option value="false" ${!targetTarif.aktif ? 'selected' : ''}>Nonaktif</option>
                    </select>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary btn-block">💾 Update Tarif</button>
                </div>
            </form>
        `;

        Utils.showModal('Edit Tarif', content);
        document.getElementById('editTarifForm').addEventListener('submit', (e) => handleEditTarif(e, id));
    } catch (error) {
        Utils.showToast('Gagal memuat tarif: ' + error.message, 'error');
    }
}

async function handleEditTarif(e, id) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
        Utils.showLoading();

        const data = {
            harga_per_m3: parseFloat(formData.get('harga')),
            aktif: formData.get('aktif') === 'true'
        };

        console.log('Update tarif data:', data);

        await API.admin.tarif.update(id, data);

        Utils.hideLoading();
        Utils.hideModal();
        Utils.showToast('Tarif berhasil diupdate!', 'success');

        // Wait a bit then reload
        setTimeout(async () => {
            await loadTarif();
        }, 500);

    } catch (error) {
        Utils.hideLoading();
        console.error('Error updating tarif:', error);
        Utils.showToast('Gagal update tarif: ' + error.message, 'error');
    }
}

async function hapusTarif(id) {
    if (!confirm('Hapus tarif ini?')) return;

    try {
        Utils.showLoading();
        await API.admin.tarif.delete(id);
        Utils.hideLoading();
        Utils.showToast('Tarif berhasil dihapus!', 'success');
        await loadTarif();
    } catch (error) {
        Utils.hideLoading();
        Utils.showToast('Gagal menghapus tarif: ' + error.message, 'error');
    }
}


// ==================== PENGATURAN ====================
async function renderPengaturanPage() {
    const contentWrapper = document.getElementById('contentWrapper');

    const html = `
        <div class="page-content">
            <div class="page-header">
                <div class="page-title">
                    <h2>Pengaturan Sistem</h2>
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <form id="pengaturanForm">
                        <div class="form-group">
                            <label>Nama Sistem</label>
                            <input type="text" name="nama_sistem" class="form-control" id="setNamaSistem">
                        </div>
                        <div class="form-group">
                            <label>Nama Instansi</label>
                            <input type="text" name="nama_instansi" class="form-control" id="setNamaInstansi" placeholder="Contoh: PAMSIMAS Desa Sukamaju">
                        </div>
                        <div class="form-group">
                            <label>Alamat Instansi</label>
                            <textarea name="alamat_instansi" class="form-control" id="setAlamatInstansi" rows="2" placeholder="Contoh: Jl. Raya Desa No. 1"></textarea>
                        </div>
                        <div class="form-group">
                            <label>No. Telp Instansi</label>
                            <input type="text" name="no_telp_instansi" class="form-control" id="setNoTelpInstansi" placeholder="Contoh: 0812-3456-7890">
                        </div>
                        <div class="form-group">
                            <label>Biaya Admin (Rp)</label>
                            <input type="number" name="biaya_admin" class="form-control" id="setBiayaAdmin" min="0">
                        </div>
                        <div class="form-group">
                            <label>Biaya Sistem (Rp)</label>
                            <input type="number" name="biaya_sistem" class="form-control" id="setBiayaSistem" min="0">
                        </div>
                        <div class="form-group">
                            <label>Biaya Petugas (Rp)</label>
                            <input type="number" name="biaya_petugas" class="form-control" id="setBiayaPetugas" min="0">
                        </div>
                        <div class="form-group">
                            <label>Hitung Gaji Berdasarkan</label>
                            <select name="hitung_gaji_berdasarkan" class="form-control" id="setHitungGaji">
                                <option value="tercatat">Sudah Dicatat</option>
                                <option value="lunas">Sudah Lunas</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary" style="margin-top: 15px;">💾 Simpan Pengaturan</button>
                    </form>
                </div>
            </div>
        </div>
    `;

    contentWrapper.innerHTML = html;
    await loadPengaturan();

    document.getElementById('pengaturanForm').addEventListener('submit', handleSavePengaturan);
}

async function loadPengaturan() {
    try {
        const pengaturanList = await API.admin.pengaturan.list();

        pengaturanList.forEach(p => {
            if (p.key === 'nama_sistem') document.getElementById('setNamaSistem').value = p.value;
            if (p.key === 'nama_perusahaan' || p.key === 'nama_instansi') document.getElementById('setNamaInstansi').value = p.value;
            if (p.key === 'alamat_perusahaan' || p.key === 'alamat_instansi') document.getElementById('setAlamatInstansi').value = p.value;
            if (p.key === 'telepon_perusahaan' || p.key === 'no_telp_instansi') document.getElementById('setNoTelpInstansi').value = p.value;
            if (p.key === 'biaya_admin') document.getElementById('setBiayaAdmin').value = p.value;
            if (p.key === 'biaya_sistem') document.getElementById('setBiayaSistem').value = p.value;
            if (p.key === 'biaya_petugas') document.getElementById('setBiayaPetugas').value = p.value;
            if (p.key === 'hitung_gaji_berdasarkan') document.getElementById('setHitungGaji').value = p.value;
        });
    } catch (error) {
        Utils.showToast('Gagal memuat pengaturan: ' + error.message, 'error');
    }
}

async function handleSavePengaturan(e) {
    e.preventDefault();

    try {
        Utils.showLoading();

        // Collect all pengaturan into array
        const pengaturanItems = [
            { key: 'nama_sistem', value: document.getElementById('setNamaSistem').value, deskripsi: 'Nama sistem' },
            { key: 'nama_perusahaan', value: document.getElementById('setNamaInstansi').value, deskripsi: 'Nama instansi' },
            { key: 'alamat_perusahaan', value: document.getElementById('setAlamatInstansi').value, deskripsi: 'Alamat instansi' },
            { key: 'telepon_perusahaan', value: document.getElementById('setNoTelpInstansi').value, deskripsi: 'No. telp instansi' },
            { key: 'biaya_admin', value: document.getElementById('setBiayaAdmin').value, deskripsi: 'Biaya admin per pencatatan' },
            { key: 'biaya_sistem', value: document.getElementById('setBiayaSistem').value, deskripsi: 'Biaya sistem per transaksi' },
            { key: 'biaya_petugas', value: document.getElementById('setBiayaPetugas').value, deskripsi: 'Biaya petugas per pencatatan' },
            { key: 'hitung_gaji_berdasarkan', value: document.getElementById('setHitungGaji').value, deskripsi: 'Hitung gaji berdasarkan' },
        ];

        // Send all in one batch request
        await API.admin.pengaturan.batch(pengaturanItems);

        Utils.hideLoading();
        Utils.showToast('Pengaturan berhasil disimpan!', 'success');
    } catch (error) {
        Utils.hideLoading();
        Utils.showToast('Gagal menyimpan pengaturan: ' + error.message, 'error');
    }
}


// ==================== USERS ====================
async function renderUsersPage() {
    const contentWrapper = document.getElementById('contentWrapper');

    const html = `
        <div class="page-content">
            <div class="page-header">
                <div class="page-title">
                    <h2>Manajemen User</h2>
                </div>
                <div class="page-actions">
                    <button class="btn btn-primary" onclick="showAddUserModal()">➕ Tambah User</button>
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Nama Lengkap</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="usersTableBody">
                                <tr><td colspan="5" class="text-center">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    contentWrapper.innerHTML = html;
    await loadUsers();
}

async function loadUsers() {
    try {
        const usersList = await API.admin.users.list();
        renderUsersTable(usersList);
    } catch (error) {
        Utils.showToast('Gagal memuat users: ' + error.message, 'error');
    }
}

function renderUsersTable(usersList) {
    const tbody = document.getElementById('usersTableBody');

    if (!usersList || usersList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada data user</td></tr>';
        return;
    }

    tbody.innerHTML = usersList.map(u => `
        <tr>
            <td><strong>${u.username}</strong></td>
            <td>${u.nama_lengkap}</td>
            <td><span class="badge badge-${u.role === 'admin' ? 'danger' : 'primary'}">${u.role}</span></td>
            <td><span class="badge badge-${u.aktif ? 'success' : 'danger'}">${u.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editUser(${u.id})">✏️</button>
                ${u.aktif ? `<button class="btn btn-sm btn-danger" onclick="hapusUser(${u.id})">🗑️</button>` : ''}
            </td>
        </tr>
    `).join('');
}

function showAddUserModal() {
    const content = `
        <form id="addUserForm">
            <div class="form-group">
                <label class="required">Username</label>
                <input type="text" name="username" class="form-control" required>
            </div>
            <div class="form-group">
                <label class="required">Password</label>
                <input type="password" name="password" class="form-control" required>
            </div>
            <div class="form-group">
                <label class="required">Nama Lengkap</label>
                <input type="text" name="nama_lengkap" class="form-control" required>
            </div>
            <div class="form-group">
                <label class="required">Role</label>
                <select name="role" class="form-control" required>
                    <option value="petugas">Petugas</option>
                    <option value="admin">Admin</option>
                </select>
            </div>
            <div class="form-group">
                <button type="submit" class="btn btn-primary btn-block">💾 Simpan User</button>
            </div>
        </form>
    `;

    Utils.showModal('Tambah User', content);
    document.getElementById('addUserForm').addEventListener('submit', handleAddUser);
}

async function handleAddUser(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
        Utils.showLoading();
        await API.admin.users.create({
            username: formData.get('username'),
            password: formData.get('password'),
            nama_lengkap: formData.get('nama_lengkap'),
            role: formData.get('role')
        });

        Utils.hideLoading();
        Utils.hideModal();
        Utils.showToast('User berhasil ditambahkan!', 'success');
        await loadUsers();
    } catch (error) {
        Utils.hideLoading();
        Utils.showToast('Gagal menambah user: ' + error.message, 'error');
    }
}

async function editUser(id) {
    const usersList = await API.admin.users.list();
    const targetUser = usersList.find(u => u.id === id);

    if (!targetUser) {
        Utils.showToast('User tidak ditemukan', 'error');
        return;
    }

    const content = `
        <form id="editUserForm">
            <div class="form-group">
                <label>Username</label>
                <input type="text" class="form-control" value="${targetUser.username}" disabled>
            </div>
            <div class="form-group">
                <label>Nama Lengkap</label>
                <input type="text" name="nama_lengkap" class="form-control" value="${targetUser.nama_lengkap}">
            </div>
            <div class="form-group">
                <label>Password Baru</label>
                <input type="password" name="password" class="form-control" placeholder="Kosongkan jika tidak diubah">
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="aktif" class="form-control">
                    <option value="true" ${targetUser.aktif ? 'selected' : ''}>Aktif</option>
                    <option value="false" ${!targetUser.aktif ? 'selected' : ''}>Nonaktif</option>
                </select>
            </div>
            <div class="form-group">
                <button type="submit" class="btn btn-primary btn-block">💾 Update User</button>
            </div>
        </form>
    `;

    Utils.showModal('Edit User', content);
    document.getElementById('editUserForm').addEventListener('submit', (e) => handleEditUser(e, id));
}

async function handleEditUser(e, id) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
        Utils.showLoading();

        const data = {
            nama_lengkap: formData.get('nama_lengkap')
        };

        const passwordValue = formData.get('password');
        if (passwordValue && passwordValue.trim() !== '') {
            data.password = passwordValue;
        }

        data.aktif = formData.get('aktif') === 'true';

        console.log('Update user data:', data);

        await API.admin.users.update(id, data);

        Utils.hideLoading();
        Utils.hideModal();
        Utils.showToast('User berhasil diupdate!', 'success');

        // Wait a bit then reload
        setTimeout(async () => {
            await loadUsers();
        }, 500);

    } catch (error) {
        Utils.hideLoading();
        console.error('Error updating user:', error);
        Utils.showToast('Gagal update user: ' + error.message, 'error');
    }
}

async function hapusUser(id) {
    if (!confirm('Hapus user ini?')) return;

    try {
        Utils.showLoading();
        await API.admin.users.delete(id);
        Utils.hideLoading();
        Utils.showToast('User berhasil dihapus!', 'success');
        await loadUsers();
    } catch (error) {
        Utils.hideLoading();
        Utils.showToast('Gagal menghapus user: ' + error.message, 'error');
    }
}


