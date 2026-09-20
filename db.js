(function () {
  const config = window.APP_DB_CONFIG || {};
  const provider = (config.provider || 'firebase').toLowerCase();
  const firebasePath = config.firebaseDbPath || 'cassy_app';

  function isFirebaseReady() {
    return !!(
      config.firebaseConfig &&
      window.firebase &&
      window.firebase.apps &&
      window.firebase.apps.length
    );
  }

  function getFirebaseDatabase() {
    if (!isFirebaseReady()) return null;

    if (!window.__CASSY_FIREBASE_APP) {
      window.__CASSY_FIREBASE_APP = window.firebase.initializeApp(
        config.firebaseConfig,
        'cassy-app'
      );
    }

    return window.firebase.database(window.__CASSY_FIREBASE_APP);
  }

  function isSupabaseReady() {
    return !!(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
  }

  async function readRemote(key) {
    if (provider === 'firebase') {
      const db = getFirebaseDatabase();
      if (!db) return null;

      const snapshot = await db.ref(`${firebasePath}/${key}`).once('value');
      return snapshot.val();
    }

    if (provider === 'supabase') {
      if (!isSupabaseReady()) return null;
      const { data, error } = await window.supabase
        .from(config.table || 'class_app')
        .select('*')
        .eq('key', key)
        .maybeSingle();

      if (error) {
        console.warn('Database read failed:', error);
        return null;
      }

      return data ? data.value : null;
    }

    return null;
  }

  async function writeRemote(key, value) {
    if (provider === 'firebase') {
      const db = getFirebaseDatabase();
      if (!db) return false;

      await db.ref(`${firebasePath}/${key}`).set(value);
      return true;
    }

    if (provider === 'supabase') {
      if (!isSupabaseReady()) return false;

      const row = { key, value, updated_at: new Date().toISOString() };
      const { error } = await window.supabase
        .from(config.table || 'class_app')
        .upsert(row, { onConflict: 'key' });

      if (error) {
        console.warn('Database write failed:', error);
        return false;
      }

      return true;
    }

    return false;
  }

  const api = {
    async getTeacher() {
      if (provider === 'firebase' || provider === 'supabase') {
        const remote = await readRemote('teacher');
        if (remote !== null && remote !== undefined) return remote;
      }
      return null;
    },
    async saveTeacher(data) {
      if (provider === 'firebase' || provider === 'supabase') {
        return await writeRemote('teacher', data);
      }
      return false;
    },
    async getSubjects() {
      if (provider === 'firebase' || provider === 'supabase') {
        const remote = await readRemote('subjects');
        if (remote !== null && remote !== undefined) return remote;
      }
      return {};
    },
    async saveSubjects(data) {
      if (provider === 'firebase' || provider === 'supabase') {
        return await writeRemote('subjects', data || {});
      }
      return false;
    }
  };

  window.CASSY_DB = api;
})();
