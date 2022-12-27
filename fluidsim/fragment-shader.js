const INITIALISE_FRAG = `
precision mediump float;

uniform sampler2D u_field;
uniform sampler2D u_source;
uniform vec2 u_resolution;

varying vec2 v_texCoord;

void main() {

}
`;

const ADD_SOURCE_FRAG = `
precision mediump float;

uniform sampler2D u_field;
uniform sampler2D u_source;
uniform vec2 u_resolution;

varying vec2 v_texCoord;

void main() {

}
`;

const DIFFUSE_FRAG = `
precision mediump float;

uniform sampler2D u_field;
uniform sampler2D u_source;
uniform vec2 u_resolution;

varying vec2 v_texCoord;

void main() {
  
}
`;

const ADVECT_FRAG = `
precision mediump float;

uniform sampler2D u_field;
uniform sampler2D u_source;
uniform vec2 u_resolution;
uniform bool u_2D // 0: 1D for density; 1: 2D for velocity;

varying vec2 v_texCoord;

void main() {
  
}
`

const PROJECT_FRAG = `
precision mediump float;

uniform sampler2D u_field;
uniform sampler2D u_source;
uniform vec2 u_resolution;

varying vec2 v_texCoord;

void main() {
  
}
`

const DISPLAY_FRAG = `
  uniform sampler2D u_image;
  uniform vec2 u_resolution;
`;