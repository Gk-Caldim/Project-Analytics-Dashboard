import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../utils/api';

// ── Async Thunks ────────────────────────────────────────────────────────────

export const fetchMOM = createAsyncThunk(
  'mom/fetch',
  async (meetingId, { rejectWithValue }) => {
    try {
      const resp = await API.get(`/mom/${meetingId}`);
      return resp.data;
    } catch (err) {
      if (err.response?.status === 404) return null; // no MOM yet
      return rejectWithValue(err.response?.data?.detail || err.message);
    }
  }
);

export const saveMOM = createAsyncThunk(
  'mom/save',
  async ({ meetingId, meetingName, projectId, projectName, momData }, { rejectWithValue }) => {
    try {
      const resp = await API.post('/mom/save', {
        meeting_id:   meetingId,
        meeting_name: meetingName,
        project_id:   projectId ? Number(projectId) : null,
        project_name: projectName,
        mom_data:     momData,
      });
      return resp.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message);
    }
  }
);

// ── Slice ───────────────────────────────────────────────────────────────────

const momSlice = createSlice({
  name: 'mom',
  initialState: {
    meetingId:   null,
    meetingName: '',
    projectId:   null,
    projectName: '',
    momData:     [],
    status:      'idle', // 'idle' | 'loading' | 'saving' | 'saved' | 'error'
    lastSaved:   null,
    error:       null,
  },
  reducers: {
    setMeetingContext(state, { payload }) {
      state.meetingId   = payload.meetingId   ?? state.meetingId;
      state.meetingName = payload.meetingName ?? state.meetingName;
      state.projectId   = payload.projectId   ?? state.projectId;
      state.projectName = payload.projectName ?? state.projectName;
    },
    setMomData(state, { payload }) {
      state.momData = payload;
    },
    addMomRows(state, { payload }) {
      // payload = new rows array; append to existing
      const startSno = state.momData.length + 1;
      const formatted = payload.map((row, i) => ({
        ...row,
        id:  Date.now() + i,
        s_no: String(startSno + i),
      }));
      state.momData = [...state.momData, ...formatted];
    },
    updateMomRow(state, { payload: { id, data } }) {
      state.momData = state.momData.map(r => (r.id === id ? { ...r, ...data } : r));
    },
    deleteMomRow(state, { payload: id }) {
      state.momData = state.momData.filter(r => r.id !== id);
    },
    resetMOM(state) {
      state.momData     = [];
      state.meetingId   = null;
      state.meetingName = '';
      state.projectId   = null;
      state.projectName = '';
      state.status      = 'idle';
      state.lastSaved   = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch
    builder
      .addCase(fetchMOM.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(fetchMOM.fulfilled, (state, { payload }) => {
        if (payload) {
          state.meetingName = payload.meeting_name || state.meetingName;
          state.projectId   = payload.project_id   || state.projectId;
          state.projectName = payload.project_name || state.projectName;
          state.momData     = payload.mom_data      || [];
          state.lastSaved   = payload.updated_at;
        }
        state.status = 'saved';
      })
      .addCase(fetchMOM.rejected, (state, { payload }) => {
        state.status = 'error';
        state.error  = payload;
      });

    // Save
    builder
      .addCase(saveMOM.pending,   (state) => { state.status = 'saving'; })
      .addCase(saveMOM.fulfilled, (state, { payload }) => {
        state.status    = 'saved';
        state.lastSaved = payload.updated_at;
      })
      .addCase(saveMOM.rejected,  (state, { payload }) => {
        state.status = 'error';
        state.error  = payload;
      });
  },
});

export const {
  setMeetingContext,
  setMomData,
  addMomRows,
  updateMomRow,
  deleteMomRow,
  resetMOM,
} = momSlice.actions;

export default momSlice.reducer;
