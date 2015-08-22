
uniform mat4 projection_matrix;
uniform mat4 view_matrix;
uniform sampler2D depth_texture;

float illumination () {
  vec3 position = (view_matrix * vec4(world_position, 1.0)).xyz;
  vec4 light_projected = projection_matrix * vec4(position, 1.0);
  vec2 light_normal = light_projected.xy/light_projected.w;
  vec2 light_uv = light_normal*0.5+0.5;

  float bias = 0.001;
  float light_depth_1 = texture2D(depth_texture, light_uv).r;
  float light_depth_2 = clamp(length(position)/40.0, 0.0, 1.0);
  float illuminated = step(light_depth_2, light_depth_1 + bias);

  gl_FragColor = vec4(illuminated, illuminated, illuminated, 1.0);
}
