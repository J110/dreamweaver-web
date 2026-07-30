'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { characterApi } from '@/utils/api';
import {
  CHARACTER_GENDERS,
  CHARACTER_TRAITS,
  CHARACTER_TYPES,
  clearPendingJob,
  createIdempotencyKey,
  loadPendingJob,
  savePendingJob,
  validateIdentity,
  validatePersonality,
} from '@/utils/characterWizard';
import { useI18n } from '@/utils/i18n';
import GenerationProgress from './GenerationProgress';
import PaidGenerationDialog from './PaidGenerationDialog';

const INITIAL_CHARACTER_INPUTS = {
  name: '',
  surpriseName: false,
  characterType: '',
  surpriseType: false,
  gender: 'not_specified',
  surpriseGender: false,
  traits: [],
  customDescription: '',
};

const optionLabel = (value, prefix, t) => t(`${prefix}${value.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join('')}`);

export default function CharacterWizard({ uid, mode = 'create', targetCharacterId = null, onDone, onEdit, onDelete }) {
  const { t } = useI18n();
  const [step, setStep] = useState('identity');
  const [inputs, setInputs] = useState(INITIAL_CHARACTER_INPUTS);
  const [quote, setQuote] = useState(null);
  const [job, setJob] = useState(null);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});
  const [reviewError, setReviewError] = useState('');
  const [showPaidDialog, setShowPaidDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef(null);

  useEffect(() => {
    const pending = loadPendingJob(uid);
    if (pending && pending.mode === mode && pending.targetCharacterId === targetCharacterId) {
      setJob({ id: pending.jobId, status: 'accepted' });
      setStep('generating');
    }
  }, [mode, targetCharacterId, uid]);

  const updateInput = (field, value) => setInputs((current) => ({ ...current, [field]: value }));

  const surprise = (valueField, surpriseField) => {
    setInputs((current) => ({ ...current, [valueField]: '', [surpriseField]: true }));
  };

  const continueIdentity = () => {
    const nextErrors = validateIdentity(inputs);
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) setStep('personality');
  };

  const continuePersonality = async () => {
    const nextErrors = validatePersonality(inputs);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      setReviewError('');
      setQuote(await characterApi.quote(mode, targetCharacterId));
      setStep('review');
    } catch {
      setReviewError(t('characterQuoteFailed'));
    }
  };

  const submit = async () => {
    if (!quote || submitting) return;
    setSubmitting(true);
    try {
      idempotencyKey.current = createIdempotencyKey(idempotencyKey.current);
      const body = {
        inputs: {
          name: inputs.surpriseName ? null : inputs.name,
          character_type: inputs.surpriseType ? null : inputs.characterType,
          gender: inputs.surpriseGender ? null : inputs.gender,
          traits: inputs.traits,
          custom_description: inputs.customDescription || null,
        },
        quote_version: quote.quote_version,
        idempotency_key: idempotencyKey.current,
      };
      const nextJob = mode === 'edit'
        ? await characterApi.editGeneration(targetCharacterId, body)
        : await characterApi.createGeneration(body);
      savePendingJob(uid, {
        jobId: nextJob.id,
        mode,
        targetCharacterId,
        startedAt: Date.now(),
      });
      setJob(nextJob);
      setShowPaidDialog(false);
      setStep('generating');
    } catch (error) {
      const message = String(error?.message || '');
      if (/stale_quote|insufficient_credits|no_slots/.test(message)) {
        setReviewError(message);
        setShowPaidDialog(false);
      } else {
        setReviewError(t('characterSubmitFailed'));
      }
      setSubmitting(false);
    }
  };

  const completed = useCallback((completedJob) => {
    clearPendingJob(uid);
    setResult(completedJob.character || completedJob.result || completedJob);
    setStep('result');
  }, [uid]);

  const failed = useCallback(() => {
    clearPendingJob(uid);
    setStep('failed');
  }, [uid]);

  const toggleTrait = (trait) => {
    setInputs((current) => ({
      ...current,
      traits: current.traits.includes(trait)
        ? current.traits.filter((item) => item !== trait)
        : current.traits.length < 5 ? [...current.traits, trait] : current.traits,
    }));
  };

  if (step === 'generating' && job) {
    return <GenerationProgress job={job} onCompleted={completed} onFailed={failed} label={t('characterGenerating')} />;
  }

  if (step === 'result' && result) {
    const profile = result.profile || result;
    return (
      <section>
        {result.portrait_url && <img src={result.portrait_url} alt="" />}
        <h1>{profile.name}</h1>
        <p>{profile.profile_summary}</p>
        <button type="button" onClick={onDone}>{t('characterDone')}</button>
        <button type="button" onClick={onEdit}>{t('characterEdit')}</button>
        <button type="button" onClick={onDelete}>{t('characterDelete')}</button>
      </section>
    );
  }

  if (step === 'failed') {
    return <section aria-live="polite"><p>{t('characterFailed')}</p><button type="button" onClick={() => setStep('review')}>{t('characterRetry')}</button></section>;
  }

  return (
    <section>
      <h1>{t('characterTitle')}</h1>
      <ol aria-label={t('characterSteps')}>
        <li aria-current={step === 'identity' ? 'step' : undefined}>{t('characterIdentity')}</li>
        <li aria-current={step === 'personality' ? 'step' : undefined}>{t('characterPersonality')}</li>
        <li aria-current={step === 'review' ? 'step' : undefined}>{t('characterReview')}</li>
      </ol>
      {step === 'identity' && <>
        <fieldset><legend>{t('characterIdentity')}</legend>
          <label>{t('characterName')}<input value={inputs.name} onChange={(event) => setInputs((current) => ({ ...current, name: event.target.value, surpriseName: false }))} /></label>
          <button type="button" onClick={() => surprise('name', 'surpriseName')}>{t('characterSurpriseName')}</button>
          <label>{t('characterType')}<select value={inputs.characterType} onChange={(event) => setInputs((current) => ({ ...current, characterType: event.target.value, surpriseType: false }))}><option value="">{t('characterChoose')}</option>{CHARACTER_TYPES.map((type) => <option key={type} value={type}>{optionLabel(type, 'characterType', t)}</option>)}</select></label>
          <button type="button" onClick={() => surprise('characterType', 'surpriseType')}>{t('characterSurpriseType')}</button>
          <label>{t('characterGender')}<select value={inputs.gender} onChange={(event) => setInputs((current) => ({ ...current, gender: event.target.value, surpriseGender: false }))}>{CHARACTER_GENDERS.map((gender) => <option key={gender} value={gender}>{optionLabel(gender, 'characterGender', t)}</option>)}</select></label>
          <button type="button" onClick={() => surprise('gender', 'surpriseGender')}>{t('characterSurpriseGender')}</button>
        </fieldset>
        {Object.values(errors).map((error) => <p key={error} role="alert">{error}</p>)}
        <button type="button" onClick={continueIdentity}>{t('characterContinue')}</button>
      </>}
      {step === 'personality' && <>
        <fieldset><legend>{t('characterTraits')}</legend>{CHARACTER_TRAITS.map((trait) => <button type="button" key={trait} aria-pressed={inputs.traits.includes(trait)} onClick={() => toggleTrait(trait)}>{optionLabel(trait, 'characterTrait', t)}</button>)}</fieldset>
        <label>{t('characterDetails')}<textarea value={inputs.customDescription} onChange={(event) => updateInput('customDescription', event.target.value)} /></label>
        {Object.values(errors).map((error) => <p key={error} role="alert">{error}</p>)}
        <button type="button" onClick={() => setStep('identity')}>{t('characterBack')}</button>
        <button type="button" onClick={continuePersonality}>{t('characterContinue')}</button>
      </>}
      {step === 'review' && quote && <>
        <p>{t('characterSlot')} {quote.slot_number} of 30</p>
        <p>{quote.credit_cost === 0 ? t('characterFree') : `${quote.credit_cost} ${t('characterCredits')}`}</p>
        <p>{quote.credits_before} → {quote.credits_after}</p>
        {reviewError && <p role="alert">{reviewError}</p>}
        <button type="button" onClick={() => setStep('personality')} disabled={submitting}>{t('characterBack')}</button>
        <button type="button" onClick={() => quote.credit_cost > 0 ? setShowPaidDialog(true) : submit()} disabled={submitting}>{t('characterCreate')}</button>
        {showPaidDialog && <PaidGenerationDialog quote={quote} onConfirm={submit} onCancel={() => setShowPaidDialog(false)} confirming={submitting} title={t('characterPaidTitle')} confirmLabel={t('characterConfirm')} cancelLabel={t('characterCancel')} />}
      </>}
    </section>
  );
}
