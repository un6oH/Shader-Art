const MIN_FS = `#version 300 es
precision highp float; void main() {}`;

const UPDATE_FIELD_FS = `#version 300 es
precision highp float;

in vec2 v_centre;
in float v_mass;
in float bodyRadius;
in vec2 toCentre;
in vec2 v_velocity;

uniform float distanceUnit;

layout(location = 0) out vec2 force;
layout(location = 1) out float mass;
layout(location = 2) out vec2 momentum;

void main() {
  float distanceToCentre = length(toCentre) / distanceUnit;

  if (distanceToCentre <= bodyRadius) {
    force = vec2(0.0, 0.0);
    mass = v_mass;
    momentum = v_velocity * v_mass;
  } else {
    vec2 centreDirection = normalize(toCentre);
    force = centreDirection * v_mass / (distanceToCentre * distanceToCentre);
    mass = 0.0;
    momentum = vec2(0);
  }
}
`;

const DRAW_BODIES_FS = `#version 300 es
precision highp float;

out vec4 colour;

void main() {
  colour = vec4(1, 0, 0, 1);
}
`;

const DISPLAY_FS = `#version 300 es
precision highp float;

in vec2 texCoords;

uniform sampler2D image;

out vec4 colour;

void main() {
  colour = vec4(texture(image, texCoords).xy, 0, 1);
}
`;