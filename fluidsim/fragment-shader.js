const ADD_SOURCE_FRAG = `
precision mediump float;

uniform vec2 u_textureResolution;
uniform sampler2D u_field;
uniform sampler2D u_source;
uniform float u_deltaTime;

varying vec2 v_texCoord;

void main() {

}
`;

const DIFFUSE_FRAG = `
precision mediump float;

uniform vec2 u_textureResolution; // constant
uniform sampler2D u_field;
uniform float u_diffusionRate; // constant
uniform float u_deltaTime; // constant
uniform int u_fieldType; // velocity or density

varying vec2 v_texCoord;

void main() {
  
}
`;

const ADVECT_FRAG = `
precision mediump float;

uniform vec2 u_textureResolution;
uniform sampler2D u_boundaries;
uniform sampler2D u_field;
uniform float deltaTime;
uniform int u_fieldType;

varying vec2 v_texCoord;

void main() {
  
}
`

//
// project
//
const CALC_DIV_FIELD_FRAG = `
precision mediump float;

uniform vec2 u_textureResolution; // constant
uniform sampler2D u_field;
uniform float h; // constant

varying vec2 v_texCoord;

void main() {
  
}
`

const CALC_GRADIENT_FIELD_FRAG = `
precision mediump float;

uniform vec2 u_textureResolution;
uniform sampler2D u_gradientField;
uniform sampler2D u_divField;

varying vec2 v_texCoord;

void main() {
  
}
`

const CALC_MASS_CONSERVING_FIELD_FRAG = `
precision mediump float;

uniform vec2 u_textureResolution;
uniform sampler2D u_field;
uniform sampler2D u_gradientField;
uniform float h;

varying vec2 v_texCoord;

void main() {
  
}
`

const SET_BOUNDARIES_FRAG = `
precision mediump float;

uniform vec2 u_textureResolution
uniform sampler2D u_boundaries;
uniform sampler2D u_field;

varying vec2 v_texCoord;

void main() {

}
`

const DISPLAY_FRAG = `
  precision mediump float;

  uniform sampler2D u_image;
  
  varying vec2 v_texCoord;

  void main() {

  }
`;