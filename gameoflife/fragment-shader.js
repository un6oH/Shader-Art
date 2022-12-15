const FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_image;
uniform vec2 u_simSize;
uniform bool u_updateCells;
// uniform bool u_display;
uniform bool u_background;

varying vec2 v_texCoord;

void main() {
  if (u_background) {
    gl_FragColor = vec4(vec3(0.0), 1.0);
    return;
  }

  if (!u_updateCells) {
    gl_FragColor = texture2D(u_image, v_texCoord);
    return;
  }

  vec2 onePixel = vec2(1.0, 1.0) / u_simSize;

  // game of life logic
  int neighbours = 0;
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      if (dot(texture2D(u_image, v_texCoord + onePixel * vec2(float(i), float(j))), vec4(1.0)) > 3.0) {
        neighbours ++;
      }
    }
  }
  bool alive = dot(texture2D(u_image, v_texCoord), vec4(1.0)) > 2.0;
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

  gl_FragColor = alive ? vec4(1.0, 1.0, 1.0, 1.0) : vec4(vec3(0.0), 1.0);
}
`