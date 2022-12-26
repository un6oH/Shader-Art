const FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_image;
uniform vec2 u_textureResolution;
uniform bool u_updateCells;

varying vec2 v_texCoord;

void main() {
  if (!u_updateCells) {
    gl_FragColor = texture2D(u_image, v_texCoord / u_textureResolution);
    return;
  }

  // game of life logic
  
}
`