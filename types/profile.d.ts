// ==========================================
// USER PREFERENCES & PROFILES
// ==========================================

type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
type EvaluationStrictness = 'lenient' | 'balanced' | 'strict';
type StarTonePreference = 'impact' | 'technical' | 'executive';

interface UserPreferences {
    evaluationStrictness: EvaluationStrictness;
    starTonePreference: StarTonePreference;
    targetAtsScore: number;
}

interface UserProfile {
    uuid: string;
    username: string;
    displayName: string;
    email?: string;
    targetRole?: string;
    industry?: string;
    experienceLevel?: ExperienceLevel;
    preferences: UserPreferences;
    createdAt?: string;
    updatedAt?: string;
}
