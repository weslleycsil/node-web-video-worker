
module.exports = function (options) {
  return function (job, ffmpeg) {
    require('./mp4.h264.video.low.js')(ffmpeg)

    ffmpeg
      .addOption('-profile:v', 'main')
      .addOption('-vf', 'scale=-2:720')

    require('./mp4.h264.audio.js')(ffmpeg)

    ffmpeg
      .addOption('-b:a', '128k')
      .addOption('-f', 'mp4')
  }
}
