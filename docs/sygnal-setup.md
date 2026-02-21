## Sygnal with Caddy & Cloudflare on Vultr

This document walks you through setting up a [Sygnal](https://github.com/matrix-org/sygnal) push gateway for Matrix, running in a Docker container. We will use [Caddy](https://caddyserver.com/) as a reverse proxy, also in Docker, to handle HTTPS automatically using DNS challenges with [Cloudflare](https://www.cloudflare.com/).

Now Cloudflare and Vultr have a deal in place where traffic from Cloudflare to Vultr and vice versa does not incur bandwidth usage. So you can pass endless amounts through without any extra billing. This is why the docs utilize Vultr, but you're free to use whatever cloud provider you want and not use Cloudflare if you so choose.

### Prerequisites

1.  **Vultr Server**: A running server instance. This guide assumes a fresh server running a common Linux distribution like Debian, Ubuntu, or Alpine.
2.  **Domain Name**: A domain name managed through Cloudflare.
3.  **Cloudflare Account**: Your domain must be using Cloudflare's DNS.
4.  **Docker & Docker Compose**: Docker and `docker-compose` must be installed on your Vultr server.
5.  **A Matrix Client**: A client like [Cinny](https://github.com/cinnyapp/cinny) that you want to point to your new push gateway.

---

### Step 1: Cloudflare Configuration

Before touching the server, we need to configure Cloudflare.

#### 1.1. DNS Record

In your Cloudflare dashboard, create an **A** (for IPv4) or **AAAA** (for IPv6) record for the subdomain you'll use for Sygnal. Point it to your Vultr server's IP address.

- **Type**: `A` or `AAAA`
- **Name**: `sygnal.your-domain.com` (or your chosen subdomain)
- **Content**: Your Vultr server's IP address
- **Proxy status**: **Proxied** (Orange Cloud). This is important for Caddy's setup.

#### 1.2. API Token

Caddy needs an API token to prove to Cloudflare that you own the domain so it can create the necessary DNS records for issuing an SSL certificate.

1.  Go to **My Profile** \> **API Tokens** in Cloudflare.
2.  Click **Create Token**.
3.  Use the **Edit zone DNS** template.
4.  Under **Permissions**, ensure `Zone:DNS:Edit` is selected.
5.  Under **Zone Resources**, select the specific zone for `your-domain.com`.
6.  Continue to summary and create the token.
7.  **Copy the generated token immediately.** You will not be able to see it again. We will use this as your `CLOUDFLARE_API_TOKEN`.

---

### Step 2: Server Preparation

#### 2.1. Connect to your Server (SSH)

If your Vultr instance uses an IPv6 address, connecting via SSH can sometimes be tricky. You can create an alias in your local `~/.ssh/config` file to make it easier.

Open or create `~/.ssh/config` on your local machine and add:

```
Host vultr-sygnal
    # Replace with your server's IPv6 or IPv4 address
    Hostname 2001:19f0:5400:1532:5400:05ff:fe78:fb25
    User root
    # For IPv6, uncomment the line below
    # AddressFamily inet6
```

Now you can connect simply by typing `ssh vultr-sygnal`.

#### 2.2. Install Docker and Docker Compose

Follow the official Docker documentation to install the Docker Engine and Docker Compose for your server's operating system.

#### 2.3. Configure Firewall

We need to allow HTTP and HTTPS traffic so Caddy can obtain certificates and serve requests. If you are using `ufw`:

```sh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

### Step 3: Project Structure and Configuration

On your Vultr server, let's create a directory to hold all our configuration files.

```sh
mkdir -p /opt/matrix-sygnal
cd /opt/matrix-sygnal
```

We will create all subsequent files inside this `/opt/matrix-sygnal` directory.

#### 3.1. Sygnal VAPID Keys

WebPush requires a VAPID key pair. The private key stays on your server, and the public key is given to clients.

1.  **Generate the Private Key**:
    Use `openssl` to generate an EC private key.

    ```sh
    # This command needs to be run in the /opt/matrix-sygnal directory
    openssl ecparam -name prime256v1 -genkey -noout -out sygnal_private_key.pem
    ```

2.  **Extract the Public Key**:
    Extract the corresponding public key from the private key. You will need this for your client configuration later.

    ```sh
    # This command extracts the public key in the correct format
    openssl ec -in sygnal_private_key.pem -pubout -outform DER | tail -c 65 | base64 | tr '/+' '_-' | tr -d '='
    ```

    **Save the output of this command.** This is your `vapidPublicKey`. It should look similar to the one from the `cinny.cc` example.

#### 3.2. Sygnal Configuration (`sygnal.yaml`)

Create a file named `sygnal.yaml`. This file tells Sygnal how to run.

```yaml
# /opt/matrix-sygnal/sygnal.yaml
http:
  bind_addresses: ['0.0.0.0']
  port: 5000

# This is where we configure our push gateway app
apps:
  # This app_id must match the one used in your client's configuration
  cc.cinny.web:
    type: webpush
    # This path is *inside the container*. We will map our generated key to it.
    vapid_private_key: /data/private_key.pem
    # An email for VAPID contact details
    vapid_contact_email: mailto:your-email@your-domain.com
```

#### 3.3. Caddy Configuration (`Caddyfile`)

Create a file named `Caddyfile`. This tells Caddy how to proxy requests.

**Replace `sygnal.your-domain.com`** with the domain you configured in Step 1.

```caddyfile
# /opt/matrix-sygnal/Caddyfile

# Reusable snippet for Cloudflare TLS
(tls_cloudflare) {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
}

# Your public-facing URL
sygnal.your-domain.com {
  # Get an SSL certificate from Let's Encrypt using the Cloudflare DNS challenge
  import tls_cloudflare

  # Log requests to standard output
  log

  # Reverse proxy requests to the sygnal container on port 5000
  # 'sygnal' is the service name we will define in docker-compose.yml
  reverse_proxy sygnal:5000
}
```

#### 3.4. Caddy Dockerfile

While you can use the standard `caddy:latest` image, you need one with the Cloudflare DNS provider plugin. Create a file named `Dockerfile` for Caddy.

```dockerfile
# /opt/matrix-sygnal/Dockerfile
FROM caddy:builder AS builder

RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare

FROM caddy:latest

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
```

#### 3.5. Environment File (`.env`)

Create a file named `.env` to securely store your Cloudflare API Token.

```.env
# /opt/matrix-sygnal/.env
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token-from-step-1
```

---

### Step 4: Docker Compose

Using `docker-compose` simplifies managing our multi-container application. Create a `docker-compose.yml` file.

```yaml
# /opt/matrix-sygnal/docker-compose.yml
version: '3.7'

services:
  caddy:
    # Build the Caddy image from our Dockerfile in the current directory
    build: .
    container_name: caddy
    hostname: caddy
    restart: unless-stopped
    networks:
      - matrix
    ports:
      # Expose standard web ports to the host
      - '80:80'
      - '443:443'
    volumes:
      # Mount the Caddyfile into the container
      - ./Caddyfile:/etc/caddy/Caddyfile
      # Create a volume for Caddy's data (certs, etc.)
      - caddy_data:/data
    # Load the Cloudflare token from the .env file
    env_file:
      - ./.env

  sygnal:
    # Use the official Sygnal image
    image: matrixdotorg/sygnal:latest
    container_name: sygnal
    hostname: sygnal
    restart: unless-stopped
    networks:
      - matrix
    volumes:
      # Mount the Sygnal config file
      - ./sygnal.yaml:/sygnal.yaml
      # Mount the generated private key to the path specified in sygnal.yaml
      - ./sygnal_private_key.pem:/data/private_key.pem
      # Create a volume for any other data Sygnal might store
      - sygnal_data:/data
    command: ['--config-path=/sygnal.yaml']

volumes:
  caddy_data:
  sygnal_data:

networks:
  matrix:
    driver: bridge
```

---

### Step 5: Launch the Services

Your directory `/opt/matrix-sygnal` should now look like this:

```
/opt/matrix-sygnal/
├── Caddyfile
├── docker-compose.yml
├── Dockerfile
├── .env
├── sygnal.yaml
└── sygnal_private_key.pem
```

Now, you can build and run everything with a single command:

```sh
cd /opt/matrix-sygnal
sudo docker-compose up --build -d
```

- `--build` tells Docker Compose to build the Caddy image from your `Dockerfile`.
- `-d` runs the containers in detached mode (in the background).

To check the status and logs:

```sh
# See if containers are running
sudo docker-compose ps

# View the live logs for both services
sudo docker-compose logs -f

# View logs for a specific service (e.g., caddy)
sudo docker-compose logs -f caddy
```

Caddy will automatically start, obtain an SSL certificate for `sygnal.your-domain.com`, and begin proxying requests to the Sygnal container.

---

### Step 6: Client Configuration

The final step is to configure your Matrix client to use your new push gateway. In Cinny, for example, you would modify its `config.json` or use a homeserver that advertises these settings.

Update the `pushNotificationDetails` section with the information from your server:

```json
"pushNotificationDetails": {
    "pushNotifyUrl": "https://sygnal.your-domain.com/_matrix/push/v1/notify",
    "vapidPublicKey": "YOUR_VAPID_PUBLIC_KEY_FROM_STEP_3.1",
    "webPushAppID": "cc.cinny.web"
}
```

- **`pushNotifyUrl`**: The public URL of your new Sygnal instance.
- **`vapidPublicKey`**: The public key you generated in step 3.1.
- **`webPushAppID`**: The application ID you defined in your `sygnal.yaml`. This must match exactly.

After configuring your client, it will register for push notifications with your Sygnal instance, which will then handle delivering them.
