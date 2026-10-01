import React, { useState } from 'react';
import type {
  UserProfile,
  ExperienceLevel,
  GitExperience,
  ContributionGoal,
} from '../types/api';
import { TagInput } from './TagInput';

interface ProfileFormProps {
  initialProfile?: UserProfile;
  onSubmit: (profile: UserProfile) => void;
  isLoading: boolean;
}

interface ValidationErrors {
  languages?: string;
  interests?: string;
  skills?: string;
  context?: string;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  initialProfile,
  onSubmit,
  isLoading,
}) => {
  const [level, setLevel] = useState<ExperienceLevel>(
    initialProfile?.level || 'beginner'
  );
  const [languages, setLanguages] = useState<string[]>(
    initialProfile?.languages || ['Python']
  );
  const [interests, setInterests] = useState<string[]>(
    initialProfile?.interests || ['developer tools']
  );
  const [skills, setSkills] = useState<string[]>(
    initialProfile?.skills || ['Git']
  );
  const [gitExperience, setGitExperience] = useState<GitExperience | ''>(
    initialProfile?.gitExperience || 'basic'
  );
  const [goal, setGoal] = useState<ContributionGoal>(
    initialProfile?.goal || 'first_contribution'
  );
  const [context, setContext] = useState<string>(
    initialProfile?.context || ''
  );
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validate = (): boolean => {
    const errs: ValidationErrors = {};

    if (languages.length === 0) {
      errs.languages = 'At least 1 programming language is required.';
    } else if (languages.length > 10) {
      errs.languages = 'Maximum 10 languages allowed.';
    } else if (languages.some((l) => l.length > 60)) {
      errs.languages = 'Each language must be 60 characters or fewer.';
    }

    if (interests.length === 0) {
      errs.interests = 'At least 1 topic of interest is required.';
    } else if (interests.length > 10) {
      errs.interests = 'Maximum 10 interests allowed.';
    } else if (interests.some((i) => i.length > 60)) {
      errs.interests = 'Each interest must be 60 characters or fewer.';
    }

    if (skills.length > 10) {
      errs.skills = 'Maximum 10 skills allowed.';
    } else if (skills.some((s) => s.length > 60)) {
      errs.skills = 'Each skill must be 60 characters or fewer.';
    }

    if (context.length > 1000) {
      errs.context = `Context exceeds 1,000 characters (${context.length} / 1000).`;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const cleanProfile: UserProfile = {
      level,
      languages: Array.from(new Set(languages.map((l) => l.trim()))).filter(Boolean),
      interests: Array.from(new Set(interests.map((i) => i.trim()))).filter(Boolean),
      goal,
    };

    const cleanSkills = Array.from(new Set(skills.map((s) => s.trim()))).filter(Boolean);
    if (cleanSkills.length > 0) {
      cleanProfile.skills = cleanSkills;
    }

    if (gitExperience) {
      cleanProfile.gitExperience = gitExperience;
    }

    const trimmedContext = context.trim();
    if (trimmedContext) {
      cleanProfile.context = trimmedContext;
    }

    onSubmit(cleanProfile);
  };

  return (
    <form className="form-container" onSubmit={handleSubmit} noValidate>
      {/* Experience Level */}
      <fieldset className="form-group" style={{ border: 'none', padding: 0 }}>
        <legend className="form-label">Developer experience level</legend>
        <div className="form-hint">
          Used to filter issue complexity and codebase expectations.
        </div>
        <div className="radio-group">
          {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map((lvl) => (
            <label key={lvl} className="radio-option">
              <input
                type="radio"
                name="level"
                value={lvl}
                checked={level === lvl}
                onChange={() => setLevel(lvl)}
              />
              <span style={{ textTransform: 'capitalize' }}>{lvl}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Languages */}
      <div className="form-group">
        <label htmlFor="input-languages" className="form-label">
          Programming languages <span aria-hidden="true">*</span>
        </label>
        <div className="form-hint" id="hint-languages">
          Add 1 to 10 languages (e.g. Python, TypeScript, Rust). Press Enter or comma.
        </div>
        <TagInput
          id="input-languages"
          tags={languages}
          onChange={(newTags) => {
            setLanguages(newTags);
            if (errors.languages) validate();
          }}
          maxTags={10}
          maxTagLength={60}
          placeholder="e.g. Python, TypeScript"
          ariaDescribedBy="hint-languages"
        />
        {errors.languages && <div className="form-error-msg">{errors.languages}</div>}
      </div>

      {/* Interests */}
      <div className="form-group">
        <label htmlFor="input-interests" className="form-label">
          Areas of interest <span aria-hidden="true">*</span>
        </label>
        <div className="form-hint" id="hint-interests">
          Add 1 to 10 project domains (e.g. CLI, web frameworks, machine learning, databases).
        </div>
        <TagInput
          id="input-interests"
          tags={interests}
          onChange={(newTags) => {
            setInterests(newTags);
            if (errors.interests) validate();
          }}
          maxTags={10}
          maxTagLength={60}
          placeholder="e.g. developer tools, databases"
          ariaDescribedBy="hint-interests"
        />
        {errors.interests && <div className="form-error-msg">{errors.interests}</div>}
      </div>

      {/* Primary Goal */}
      <div className="form-group">
        <label htmlFor="select-goal" className="form-label">
          Contribution goal <span aria-hidden="true">*</span>
        </label>
        <div className="form-hint" id="hint-goal">
          Determines whether the matcher emphasizes beginner labels, docs, or feature tickets.
        </div>
        <select
          id="select-goal"
          className="form-select"
          value={goal}
          onChange={(e) => setGoal(e.target.value as ContributionGoal)}
          aria-describedby="hint-goal"
        >
          <option value="first_contribution">First contribution (labeled starter issues)</option>
          <option value="portfolio">Portfolio project (notable features or modules)</option>
          <option value="learn_technology">Learn a technology (new frameworks or tools)</option>
          <option value="documentation">Documentation (guides, examples, typo fixes)</option>
          <option value="bugs_tests">Bug fixes and tests (regression tests and test suites)</option>
          <option value="features">Feature development (moderate to large enhancements)</option>
        </select>
      </div>

      {/* Skills / Frameworks (Optional) */}
      <div className="form-group">
        <label htmlFor="input-skills" className="form-label">
          Existing skills and frameworks <span className="form-label-optional">(optional)</span>
        </label>
        <div className="form-hint" id="hint-skills">
          Specific libraries or tools you know (e.g. React, Docker, PyTorch, pytest). Up to 10 items.
        </div>
        <TagInput
          id="input-skills"
          tags={skills}
          onChange={(newTags) => {
            setSkills(newTags);
            if (errors.skills) validate();
          }}
          maxTags={10}
          maxTagLength={60}
          placeholder="e.g. React, pytest, Docker"
          ariaDescribedBy="hint-skills"
        />
        {errors.skills && <div className="form-error-msg">{errors.skills}</div>}
      </div>

      {/* Git Experience (Optional) */}
      <fieldset className="form-group" style={{ border: 'none', padding: 0 }}>
        <legend className="form-label">
          Git and GitHub experience <span className="form-label-optional">(optional)</span>
        </legend>
        <div className="radio-group">
          {(
            [
              { val: 'none', label: 'None (need basic branch/PR guidance)' },
              { val: 'basic', label: 'Basic (familiar with clone, commit, push)' },
              { val: 'comfortable', label: 'Comfortable (rebase, merge conflicts, CI)' },
            ] as const
          ).map((item) => (
            <label key={item.val} className="radio-option">
              <input
                type="radio"
                name="gitExperience"
                value={item.val}
                checked={gitExperience === item.val}
                onChange={() => setGitExperience(item.val)}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Additional Context (Optional) */}
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <label htmlFor="input-context" className="form-label">
            Additional notes or background <span className="form-label-optional">(optional)</span>
          </label>
          <span className="form-char-count">{context.length} / 1000</span>
        </div>
        <div className="form-hint" id="hint-context">
          Brief notes on what you want to practice or avoid (max 1,000 characters).
        </div>
        <textarea
          id="input-context"
          className="form-textarea"
          value={context}
          onChange={(e) => {
            setContext(e.target.value);
            if (errors.context) validate();
          }}
          rows={3}
          maxLength={1200}
          placeholder="e.g. Looking to write unit tests for backend APIs or improve CLI usability."
          aria-describedby="hint-context"
        />
        {errors.context && <div className="form-error-msg">{errors.context}</div>}
      </div>

      <button type="submit" className="btn-primary" disabled={isLoading}>
        {isLoading ? 'Finding matching repositories...' : 'Find matching repositories'}
      </button>
    </form>
  );
};
