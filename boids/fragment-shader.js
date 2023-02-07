const UPDATE_POSITION_FS = `#version 300 es
precision highp float;
void main() {}
`;

const DRAW_DISPLACEMENT_AOI_FS = `#version 300 es

precision highp float;

in vec2 displacement;

out vec4 colour;

void main() {
  vec2 v = normalize(displacement) - displacement;
  colour = vec4(v, 1, 1);
}
`;
 
const DRAW_VELOCITY_AOI_FS = `#version 300 es
precision highp float;

uniform vec2 velocity;

out vec4 colour;

void main() {
  colour = vec4(velocity, 1, 1);
}
`;
 
const DRAW_POSITION_AOI_FS = `#version 300 es

precision highp float;

uniform vec2 centre;

out vec4 colour;

void main() {
  colour = vec4(centre, 1, 1);
}
`;

const DRAW_BOIDS_FS = `#version 300 es

precision highp float;

in vec3 v_colour;

out vec4 colour;

void main() {
  colour = vec4(v_colour, 1);
}
`;

const DRAW_TEXTURE_FS = `#version 300 es

precision highp float;

uniform sampler2D u_texture;
uniform vec2 canvasDimensions;

out vec4 colour;

void main() {
  vec3 v = texture(u_texture, gl_FragCoord.xy / canvasDimensions).xyz;
  if (v.z != 0.) {
    v.xy /= v.z * 60.0;
  }
  colour = vec4(0.5 + 0.5 * v.xy, 10./255. * v.z, 1.0);
}
`