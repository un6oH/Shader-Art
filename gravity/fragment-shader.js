const UPDATE_POSITION_FS = 
`#version 300 es
precision highp float;
void main() {}
`;

const DRAW_GRAVITY_FIELD_FS = 
`#version 300 es
precision highp float;

in vec2 forceVector;
in float distance;

out vec4 colour;

void main() {
  float rCubed = distance * distance * distance;
  vec2 v = forceVector / rCubed;
  colour = vec4(v, 1, 1);
}
`; 

const RENDER_CIRCLES_FS = 
`#version 300 es
precision highp float;

in vec3 v_colour;

out vec4 colour;

void main() {
  
}
`; 

const DISPLAY_FS = 
`#version 300 es
precision highp float;

in vec2 position;

out vec4 colour;

void main() {

}
`;