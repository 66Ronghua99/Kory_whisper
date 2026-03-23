function playCueInBackground(playCue, onError) {
  Promise.resolve()
    .then(() => playCue())
    .catch((error) => {
      if (typeof onError === 'function') {
        onError(error);
      }
    });
}

async function startRecordingFeedback({
  audioRecorder,
  trayManager,
  audioCuePlayer,
  onAudioCueError
}) {
  await audioRecorder.start();
  trayManager.setRecordingState(true);
  playCueInBackground(() => audioCuePlayer.playRecordingStart(), onAudioCueError);
}

async function announceOutputReady({
  trayManager,
  audioCuePlayer,
  onAudioCueError
}) {
  trayManager.showSuccessState();
  playCueInBackground(() => audioCuePlayer.playOutputReady(), onAudioCueError);
}

module.exports = {
  startRecordingFeedback,
  announceOutputReady
};
