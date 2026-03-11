// API Helper Functions
const API = {
    formatErrorMessage(errorData) {
        if (!errorData) return 'An error occurred';

        if (typeof errorData === 'string') return errorData;

        if (Array.isArray(errorData.detail)) {
            return errorData.detail.map(item => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object') {
                    const field = Array.isArray(item.loc) ? item.loc.join('.') : '';
                    return field ? `${field}: ${item.msg || 'Invalid value'}` : (item.msg || 'Invalid value');
                }
                return 'Invalid value';
            }).join('; ');
        }

        if (typeof errorData.detail === 'string') return errorData.detail;
        if (errorData.detail && typeof errorData.detail === 'object') {
            return errorData.detail.message || JSON.stringify(errorData.detail);
        }

        return errorData.message || 'An error occurred';
    },

    async request(endpoint, options = {}) {
        const token = Config.getToken();

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(Config.getApiUrl(endpoint), mergedOptions);

            // Handle 401 Unauthorized
            if (response.status === 401) {
                Config.logout();
                throw new Error('Session expired. Please login again.');
            }

            // Handle other errors
            if (!response.ok) {
                const error = await response.json().catch(() => ({
                    detail: 'An error occurred'
                }));
                throw new Error(API.formatErrorMessage(error));
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            if (error instanceof TypeError && String(error.message).includes('Failed to fetch')) {
                throw new Error(`Tidak bisa terhubung ke server API: ${Config.getApiUrl(endpoint)}`);
            }
            throw error;
        }
    },

    // Auth endpoints
    auth: {
        login: (username, password) => {
            return API.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
        }
    },

    // Pelanggan endpoints
    pelanggan: {
        list: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return API.request(`/pelanggan/${queryString ? `?${queryString}` : ''}`);
        },

        get: (id) => {
            return API.request(`/pelanggan/${id}`);
        },

        getByKode: (kode) => {
            return API.request(`/pelanggan/kode/${kode}`);
        },

        create: (data) => {
            return API.request('/pelanggan/', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        createAuto: (data) => {
            return API.request('/pelanggan/auto', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        update: (id, data) => {
            return API.request(`/pelanggan/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        },

        delete: (id) => {
            return API.request(`/pelanggan/${id}`, {
                method: 'DELETE'
            });
        }
    },

    // Pencatatan endpoints
    pencatatan: {
        list: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return API.request(`/pencatatan/${queryString ? `?${queryString}` : ''}`);
        },

        get: (id) => {
            return API.request(`/pencatatan/${id}`);
        },

        create: (data) => {
            return API.request('/pencatatan/', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        update: (id, data) => {
            return API.request(`/pencatatan/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        },

        delete: (id) => {
            return API.request(`/pencatatan/${id}`, {
                method: 'DELETE'
            });
        },

        uploadFoto: (id, file) => {
            const token = Config.getToken();
            const formData = new FormData();
            formData.append('file', file);

            return fetch(Config.getApiUrl(`/pencatatan/${id}/upload-foto`), {
                method: 'POST',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: formData
            }).then(response => {
                if (!response.ok) {
                    throw new Error('Failed to upload foto');
                }
                return response.json();
            });
        },

        getTagihan: (id) => {
            return API.request(`/pencatatan/${id}/tagihan`);
        },

        getLaporanBulanan: (bulan, tahun, petugasId = null) => {
            const params = { bulan, tahun };
            if (petugasId) params.petugas_id = petugasId;
            const queryString = new URLSearchParams(params).toString();
            return API.request(`/pencatatan/laporan/bulanan?${queryString}`);
        },

        getTarif: (kategori = null, aktif = null) => {
            const params = {};
            if (kategori) params.kategori = kategori;
            if (aktif !== null) params.aktif = aktif;
            const queryString = new URLSearchParams(params).toString();
            return API.request(`/pencatatan/tarif${queryString ? `?${queryString}` : ''}`);
        },

        getPengaturanInstansi: () => {
            return API.request('/pencatatan/pengaturan-instansi');
        }
    },

    // Pembayaran endpoints
    pembayaran: {
        list: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return API.request(`/pembayaran/${queryString ? `?${queryString}` : ''}`);
        },

        get: (id) => {
            return API.request(`/pembayaran/${id}`);
        },

        getByPencatatan: (pencatatanId) => {
            return API.request(`/pembayaran/pencatatan/${pencatatanId}`);
        },

        proses: (pencatatanId, metodeBayar = 'tunai', keterangan = null) => {
            return API.request(`/pembayaran/proses?pencatatan_id=${pencatatanId}&metode_bayar=${metodeBayar}${keterangan ? `&keterangan=${keterangan}` : ''}`, {
                method: 'POST'
            });
        },

        getPengaturanInstansi: () => {
            return API.request('/pembayaran/pengaturan/instansi');
        },

        getNota: (id) => {
            return API.request(`/pembayaran/${id}/nota`);
        },

        updateStatus: (id, statusBayar, keterangan = null) => {
            return API.request(`/pembayaran/${id}?status_bayar=${statusBayar}${keterangan ? `&keterangan=${keterangan}` : ''}`, {
                method: 'PUT'
            });
        },

        delete: (id) => {
            return API.request(`/pembayaran/${id}`, {
                method: 'DELETE'
            });
        },

        getRekapPetugas: (petugasId, bulan = null, tahun = null, hitungBerdasarkan = 'tercatat') => {
            const params = { hitung_berdasarkan: hitungBerdasarkan };
            if (bulan) params.bulan = bulan;
            if (tahun) params.tahun = tahun;
            const queryString = new URLSearchParams(params).toString();
            return API.request(`/pembayaran/rekap/petugas/${petugasId}?${queryString}`);
        },

        getRekapAllPetugas: (bulan = null, tahun = null, hitungBerdasarkan = 'tercatat') => {
            const params = { hitung_berdasarkan: hitungBerdasarkan };
            if (bulan) params.bulan = bulan;
            if (tahun) params.tahun = tahun;
            const queryString = new URLSearchParams(params).toString();
            return API.request(`/pembayaran/rekap/all-petugas?${queryString}`);
        }
    },

    // Admin endpoints
    admin: {
        tarif: {
            list: (kategori = null, aktif = null) => {
                const params = {};
                if (kategori) params.kategori = kategori;
                if (aktif !== null) params.aktif = aktif;
                const queryString = new URLSearchParams(params).toString();
                return API.request(`/admin/tarif/${queryString ? `?${queryString}` : ''}`);
            },

            create: (data) => {
                return API.request('/admin/tarif/', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
            },

            update: (id, data) => {
                // Build query parameters
                const params = new URLSearchParams();
                if (data.harga_per_m3 !== undefined) {
                    params.append('harga_per_m3', data.harga_per_m3);
                }
                if (data.aktif !== undefined) {
                    params.append('aktif', data.aktif.toString());
                }

                return API.request(`/admin/tarif/${id}?${params.toString()}`, {
                    method: 'PUT'
                });
            },

            delete: (id) => {
                return API.request(`/admin/tarif/${id}`, {
                    method: 'DELETE'
                });
            }
        },

        pengaturan: {
            list: () => {
                return API.request('/admin/pengaturan/');
            },

            get: (key) => {
                return API.request(`/admin/pengaturan/${key}`);
            },

            set: (key, value, deskripsi = null) => {
                return API.request('/admin/pengaturan/', {
                    method: 'POST',
                    body: JSON.stringify({
                        key: key,
                        value: String(value),
                        deskripsi: deskripsi || null
                    })
                });
            },

            batch: (items) => {
                return API.request('/admin/pengaturan/batch', {
                    method: 'POST',
                    body: JSON.stringify({
                        items: items
                    })
                });
            },

            delete: (key) => {
                return API.request(`/admin/pengaturan/${key}`, {
                    method: 'DELETE'
                });
            }
        },

        users: {
            list: (role = null) => {
                const queryString = role ? `?role=${role}` : '';
                return API.request(`/admin/users/${queryString}`);
            },

            create: (data) => {
                return API.request('/admin/users/', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
            },

            update: (id, data) => {
                // Build query parameters
                const params = new URLSearchParams();
                if (data.nama_lengkap !== undefined && data.nama_lengkap !== null) {
                    params.append('nama_lengkap', data.nama_lengkap);
                }
                if (data.password !== undefined && data.password !== null) {
                    params.append('password', data.password);
                }
                if (data.aktif !== undefined && data.aktif !== null) {
                    params.append('aktif', data.aktif.toString());
                }

                return API.request(`/admin/users/${id}?${params.toString()}`, {
                    method: 'PUT'
                });
            },

            delete: (id) => {
                return API.request(`/admin/users/${id}`, {
                    method: 'DELETE'
                });
            }
        }
    },

    // Print endpoints
    print: {
        thermal: (commands, ukuran = 58, method = 'rawbt') => {
            return API.request('/print/thermal', {
                method: 'POST',
                body: JSON.stringify({
                    commands: commands,
                    ukuran: ukuran,
                    method: method
                })
            });
        },

        test: () => {
            return API.request('/print/thermal/test', {
                method: 'POST'
            });
        },

        health: () => {
            return API.request('/print/health');
        },

        getQrCode: (encodedCommands) => {
            return API.request(`/print/thermal/qr/${encodedCommands}`);
        }
    },

    // Get RT/RW List dari API dan cache di session storage
    getRtRwList: async function() {
        const user = Config.getUser();
        const cacheKey = user.role === 'admin' ? 'rtRwList_admin' : 'rtRwList_petugas';

        // Cek cache di session storage
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (e) {
                console.error('Error parsing cache:', e);
            }
        }

        // Jika tidak ada cache, ambil dari API
        try {
            // Ambil semua pelanggan untuk extract RT/RW
            // Admin: semua pelanggan, Petugas: hanya miliknya
            const allPelanggan = await API.pelanggan.list({ limit: 1000 });

            // Extract unique RT dan RW
            const rtSet = new Set();
            const rwSet = new Set();

            allPelanggan.forEach(p => {
                if (p.rt && p.rt !== '' && p.rt !== null) rtSet.add(p.rt);
                if (p.rw && p.rw !== '' && p.rw !== null) rwSet.add(p.rw);
            });

            const rtList = Array.from(rtSet).sort();
            const rwList = Array.from(rwSet).sort();

            const result = { rt: rtList, rw: rwList };

            // Simpan ke session storage
            sessionStorage.setItem(cacheKey, JSON.stringify(result));

            return result;
        } catch (error) {
            console.error('Error getting RT/RW list:', error);
            return { rt: [], rw: [] };
        }
    },

    // Invalidate cache RT/RW
    invalidateRtRwCache: function() {
        const user = Config.getUser();
        const cacheKey = user.role === 'admin' ? 'rtRwList_admin' : 'rtRwList_petugas';
        sessionStorage.removeItem(cacheKey);
    }
};
