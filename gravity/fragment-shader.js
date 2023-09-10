const UPDATE_POSITION_FS = 
`#version 300 es
precision highp float;
void main() {}
`;

const DRAW_GRAVITY_FIELD_FS = 
`#version 300 es
precision highp float;

in vec2 pointToCentre;
in float distance;

uniform float mass;

out vec4 colour;

void main() {
  if (distance < 1.5) {
    colour = vec4(vec3(0.0), 1.0);
    return;
  }

  vec2 direction = normalize(pointToCentre);
  float distanceSquared = distance * distance;
  vec2 force = direction * mass / distanceSquared;

  colour = vec4(force, 0.0, 1.0);
}
`; 

const RENDER_CIRCLES_FS = 
`#version 300 es
precision highp float;

in vec3 v_colour;

out vec4 colour;

void main() {
  colour = vec4(v_colour, 1.0);
}
`; 

const DISPLAY_FS = 
`#version 300 es
precision highp float;

uniform sampler2D image;
uniform vec2 canvasDimensions;

out vec4 colour;

void main() {
  vec4 value = texture(image, gl_FragCoord.xy / canvasDimensions);
  // colour = vec4((atan(value) / 3.14159265359 + 0.5).xyz, 1.0);
  colour = vec4(value.xyz + 0.5, 1.0);
}
`;