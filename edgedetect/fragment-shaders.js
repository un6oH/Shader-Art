const FS = 
`#version 300 es
precision highp float;

void main() {

}
`;

const SHADE_RANGE_FS = 
`#version 300 es
precision highp float;

in vec4 v_colour;

out vec4 colour;

void main() {
  colour = v_colour;
}
`;

const DISPLAY_FS = 
`#version 300 es
precision highp float;

in vec2 texCoord;

uniform sampler2D image;

out vec4 colour;

void main() {
  colour = texture(image, texCoord);
}
`;
