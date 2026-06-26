/** High-quality mic capture tuned to sound like the native camera.
 *
 *  echoCancellation / noiseSuppression are what make WebRTC mic audio sound thin
 *  and "underwater" (they're tuned for phone calls), so we keep them OFF for a
 *  raw, full-range sound.
 *
 *  BUT autoGainControl must stay ON: it's the level-normaliser that brings a
 *  quiet phone mic up to a comfortable loudness — exactly what the native camera
 *  app does. With it off, the raw mic signal records far too quiet ("barely
 *  hearable"). Disabling it earlier (to chase the underwater artifact, which is
 *  actually from noiseSuppression) is what made the audio inaudible.
 *
 *  channelCount is mono: phone mics are single-capsule, so asking for stereo
 *  lands the signal in one channel only and plays back ~6 dB quieter.
 *
 *  Shared by useCameraStream (which now acquires the mic up-front, together with
 *  the camera, so iOS Chrome actually prompts for it) and useMediaRecorder. */
export const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: true,
  sampleRate: 48_000,
  channelCount: 1,
};
