export type NgrokTunnel = {
  name: string;
  public_url: string;
  config?: { addr?: string };
};

export type NgrokTunnelsResponse = {
  tunnels?: NgrokTunnel[];
};
