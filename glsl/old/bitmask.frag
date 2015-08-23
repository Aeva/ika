precision mediump float;

uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;

uniform sampler2D mask_texture;
uniform sampler2D fg_texture;
uniform sampler2D bg_texture;

#include "normalize_screen_coord.glsl"


void main(void) {
  vec2 tcoords = normalize_screen_coord(gl_FragCoord.xy);
  float mask = texture2D(mask_texture, tcoords).r;
  vec4 sampled = mask < 0.5 ? texture2D(bg_texture, tcoords) : texture2D(fg_texture, tcoords);
  gl_FragColor = sampled;
}
