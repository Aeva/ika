
float illumination () {
  // transform the world coordinate into the light's view space
  vec3 position = (light_view_matrix * vec4(world_position, 1.0)).xyz;
  // apply the light's projection matrix
  vec4 light_projected = light_projection_matrix * vec4(position, 1.0);
  
  // determine the vector from the light source to the fragment
  vec2 light_normal = light_projected.xy/light_projected.w;
  vec2 light_uv = light_normal*0.5+0.5;

  if (light_uv.x < 0.0 || light_uv.y < 0.0 || light_uv.x > 1.0 || light_uv.y > 1.0) {
    return 0.0;
  }

  float bias = 0.001;
  float scale = 40.0;
  scale = mystery_scalar;
  float light_depth_1 = texture2D(depth_texture, light_uv).r;
  float light_depth_2 = clamp(length(position)/scale, 0.0, 1.0);
  float illuminated = step(light_depth_2, light_depth_1 + bias);

  return illuminated;
}
