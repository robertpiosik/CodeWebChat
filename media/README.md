Convert mp4 to gif using:

`ffmpeg -i example.mp4 -vf "fps=15,scale=900:-1:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff:max_colors=64[p];[s1][p]paletteuse=dither=none" example.gif`
