const UPDATE_FS = `#version 300 es
precision mediump float;

in vec2 texCoord;

uniform sampler2D grid;
uniform vec2 gridSize;

out vec4 pixel;

void main() {
  vec2 onePixel = vec2(1, 1) / gridSize;

  // count alive in 
  int neighbours = 0;
  for (float i = -1.0; i <= 1.0; i += 1.0) {
    for (float j = -1.0; j <= 1.0; j += 1.0) {
      if (texture(grid, texCoord + onePixel * vec2(i, j)).x > 0.0) {
        neighbours ++;
      }
    }
  }
  bool alive = texture(grid, texCoord).x > 0.0;
  if (alive) {
    neighbours --;
    if (neighbours > 3 || neighbours < 2) {
      alive = false;
    }
  } else {
    if (neighbours == 3) {
      alive = true;
    }
  }

  pixel = alive ? vec4(1.0) : vec4(vec3(0.0), 1.0);
}
`

const DRAW_TEXTURE_FS = `#version 300 es
precision mediump float;

in vec2 texCoord;

uniform sampler2D image;

out vec4 colour;

void main() {
  colour = texture(image, texCoord);
}
`