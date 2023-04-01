const UPDATE_POSITION_FS = 
`#version 300 es
precision highp float;
void main() {}
`;

const DRAW_GRAVITY_FIELD_FS = 
`#version 300 es
precision highp float;

in vec2 force;
in float distance;

out vec4 colour;

void main() {
  float rSquared = distance * distance;
  vec2 v = force / rSquared;
  colour = vec4(v, 1, 1);
}
`; 

const DISPLAY_FS = 
`#version 300 es
precision highp float;

in vec3 colour;

out vec4 outColour;

void main() {
  
}
`; 