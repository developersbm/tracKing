import { db } from '../firebase-config';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';

// User IDs
export const SEBASTIAN_ID = 'sebastian-athlete';
export const BRANDON_ID = 'brandon-coach';

// Get current user ID based on URL
export const getCurrentUserId = () => {
  const path = window.location.pathname;
  return path.includes('/coach') ? BRANDON_ID : SEBASTIAN_ID;
};

// USER OPERATIONS

export const getUser = async (userId) => {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const getCurrentUser = async () => {
  const userId = getCurrentUserId();
  return getUser(userId);
};

// COACH-ATHLETE OPERATIONS

export const getCoachAthletes = async (coachId) => {
  const q = query(collection(db, 'coachAthleteLinks'), where('coachId', '==', coachId));
  const snapshot = await getDocs(q);
  
  const athletes = [];
  for (const linkDoc of snapshot.docs) {
    const athleteId = linkDoc.data().athleteId;
    const athlete = await getUser(athleteId);
    if (athlete) athletes.push(athlete);
  }
  return athletes;
};

export const getCoachAthleteLink = async (coachId, athleteId) => {
  const q = query(
    collection(db, 'coachAthleteLinks'),
    where('coachId', '==', coachId),
    where('athleteId', '==', athleteId)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
};

export const updateCoachAthleteNotes = async (coachId, athleteId, overallCoachNotes) => {
  const link = await getCoachAthleteLink(coachId, athleteId);
  if (!link) {
    console.error('Coach-athlete link not found');
    return null;
  }
  const linkRef = doc(db, 'coachAthleteLinks', link.id);
  await updateDoc(linkRef, {
    overallCoachNotes,
    updatedAt: Timestamp.now()
  });
  return { id: link.id, coachId, athleteId, overallCoachNotes };
};

// EXERCISE OPERATIONS

export const getExercises = async () => {
  const snapshot = await getDocs(collection(db, 'exercises'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getExercise = async (exerciseId) => {
  const docRef = doc(db, 'exercises', exerciseId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const createExercise = async (exerciseData) => {
  const userId = getCurrentUserId();
  const docRef = await addDoc(collection(db, 'exercises'), {
    ...exerciseData,
    createdById: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return { id: docRef.id, ...exerciseData };
};

// WORKOUT TEMPLATE OPERATIONS

export const getWorkoutTemplates = async (coachId) => {
  const q = query(collection(db, 'workoutTemplates'), where('coachId', '==', coachId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createWorkoutTemplate = async (templateData) => {
  const userId = getCurrentUserId();
  const docRef = await addDoc(collection(db, 'workoutTemplates'), {
    ...templateData,
    coachId: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return { id: docRef.id, ...templateData };
};

// ASSIGNED WORKOUT OPERATIONS

export const getAssignedWorkouts = async (athleteId) => {
  const q = query(
    collection(db, 'assignedWorkouts'), 
    where('athleteId', '==', athleteId),
    orderBy('startDate', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const assignWorkoutToAthlete = async (workoutTemplateId, athleteId, startDate, endDate, notes) => {
  const docRef = await addDoc(collection(db, 'assignedWorkouts'), {
    workoutTemplateId,
    athleteId,
    startDate: Timestamp.fromDate(new Date(startDate)),
    endDate: Timestamp.fromDate(new Date(endDate)),
    notes: notes || null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return { id: docRef.id, workoutTemplateId, athleteId, startDate, endDate, notes };
};

// SESSION OPERATIONS

export const getSessions = async (athleteId, filters = {}) => {
  try {
    let q = query(
      collection(db, 'sessions'),
      where('athleteId', '==', athleteId)
    );
    
    if (filters.startDate) {
      q = query(q, where('startTime', '>=', Timestamp.fromDate(new Date(filters.startDate))));
    }
    if (filters.endDate) {
      q = query(q, where('startTime', '<=', Timestamp.fromDate(new Date(filters.endDate))));
    }
    
    q = query(q, orderBy('startTime', 'desc'));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    // If index doesn't exist, fall back to simple query without ordering
    console.warn('Index not found, using simple query. Create index at:', error.message);
    const q = query(
      collection(db, 'sessions'),
      where('athleteId', '==', athleteId)
    );
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort in memory
    return docs.sort((a, b) => {
      const aTime = a.startTime?.toMillis?.() || 0;
      const bTime = b.startTime?.toMillis?.() || 0;
      return bTime - aTime;
    });
  }
};

export const getSession = async (sessionId) => {
  const docRef = doc(db, 'sessions', sessionId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const createSession = async (athleteId, exerciseId, assignedWorkoutId = null) => {
  const docRef = await addDoc(collection(db, 'sessions'), {
    athleteId,
    exerciseId,
    assignedWorkoutId,
    startTime: Timestamp.now(),
    endTime: null,
    totalReps: 0,
    correctReps: 0,
    formScoreAvg: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return { id: docRef.id, athleteId, exerciseId, assignedWorkoutId };
};

export const updateSessionNotes = async (sessionId, coachNotes) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  await updateDoc(sessionRef, {
    coachNotes,
    updatedAt: Timestamp.now()
  });
  return { id: sessionId, coachNotes };
};

export const endSession = async (sessionId) => {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    
    // Get all reps for this session
    const reps = await getRepsForSession(sessionId);
    const total = reps.length;
    const correct = reps.filter(r => r.isCorrect).length;
    const avg = total > 0 ? reps.reduce((sum, r) => sum + (r.formScore || 0), 0) / total : 0;
    
    console.log('Ending session:', { sessionId, total, correct, avg });
    
    await updateDoc(sessionRef, {
      endTime: Timestamp.now(),
      totalReps: total,
      correctReps: correct,
      formScoreAvg: Math.round(avg * 100) / 100, // Round to 2 decimals
      updatedAt: Timestamp.now()
    });
    
    return getSession(sessionId);
  } catch (error) {
    console.error('Error in endSession:', error);
    throw error;
  }
};

export const deleteSession = async (sessionId) => {
  try {
    // Delete all reps for this session
    const reps = await getRepsForSession(sessionId);
    for (const rep of reps) {
      await deleteDoc(doc(db, 'reps', rep.id));
    }
    
    // Delete the session
    await deleteDoc(doc(db, 'sessions', sessionId));
    
    console.log('Session and associated reps deleted:', sessionId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
};

// REP OPERATIONS

export const getRepsForSession = async (sessionId) => {
  const q = query(
    collection(db, 'reps'),
    where('sessionId', '==', sessionId),
    orderBy('repNumber', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const logReps = async (sessionId, repsData) => {
  const batch = [];
  
  for (const repData of repsData) {
    const docRef = await addDoc(collection(db, 'reps'), {
      sessionId,
      repNumber: repData.repNumber,
      timestamp: Timestamp.now(),
      formScore: repData.formScore,
      isCorrect: repData.isCorrect,
      angleDown: repData.angleDown || null,
      angleUp: repData.angleUp || null
    });
    batch.push({ id: docRef.id, ...repData });
  }
  
  // Update session aggregates
  const sessionRef = doc(db, 'sessions', sessionId);
  const allReps = await getRepsForSession(sessionId);
  const total = allReps.length;
  const correct = allReps.filter(r => r.isCorrect).length;
  const avg = total ? allReps.reduce((sum, r) => sum + r.formScore, 0) / total : 0;
  
  await updateDoc(sessionRef, {
    totalReps: total,
    correctReps: correct,
    formScoreAvg: avg,
    updatedAt: Timestamp.now()
  });
  
  return getSession(sessionId);
};

// COACH OVERVIEW

export const getCoachOverview = async (coachId, dateRange = {}) => {
  const athletes = await getCoachAthletes(coachId);
  
  const athleteStats = [];
  for (const athlete of athletes) {
    const sessions = await getSessions(athlete.id, dateRange);
    
    const totalSessions = sessions.length;
    const totalReps = sessions.reduce((sum, s) => sum + (s.totalReps || 0), 0);
    const avgFormScore = sessions.length
      ? sessions.reduce((sum, s) => sum + (s.formScoreAvg || 0), 0) / sessions.length
      : 0;
    
    athleteStats.push({
      athlete,
      totalSessions,
      totalReps,
      avgFormScore: Math.round(avgFormScore * 100) / 100
    });
  }
  
  return athleteStats;
};

// ATHLETE PROGRESS

export const getAthleteProgress = async (athleteId, dateRange = {}) => {
  const sessions = await getSessions(athleteId, dateRange);
  
  return {
    totalSessions: sessions.length,
    totalReps: sessions.reduce((sum, s) => sum + (s.totalReps || 0), 0),
    totalCorrectReps: sessions.reduce((sum, s) => sum + (s.correctReps || 0), 0),
    avgFormScore: sessions.length
      ? sessions.reduce((sum, s) => sum + (s.formScoreAvg || 0), 0) / sessions.length
      : 0,
    sessions: sessions.map(s => ({
      id: s.id,
      date: s.startTime?.toDate?.() || new Date(),
      totalReps: s.totalReps || 0,
      correctReps: s.correctReps || 0,
      formScore: s.formScoreAvg || 0,
      coachNotes: s.coachNotes || null
    }))
  };
};

// ATHLETE COACH NOTES

export const getAthleteCoachNotes = async (athleteId) => {
  try {
    // Find the coach-athlete link for this athlete
    const q = query(
      collection(db, 'coachAthleteLinks'),
      where('athleteId', '==', athleteId)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const link = snapshot.docs[0].data();
    return link.overallCoachNotes || null;
  } catch (error) {
    console.error('Error fetching athlete coach notes:', error);
    return null;
  }
};
