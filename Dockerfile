FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY carelink-handoff/frontend/carelink-app/package.json carelink-handoff/frontend/carelink-app/package-lock.json ./
RUN npm ci --ignore-scripts
COPY carelink-handoff/frontend/carelink-app/public ./public
COPY carelink-handoff/frontend/carelink-app/src ./src
COPY carelink-handoff/frontend/carelink-app/scripts/build-sw.js ./scripts/build-sw.js
RUN CI=true npm run build

FROM python:3.12-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 CARELINK_CLOUD_MODE=1 CARELINK_COOKIE_SECURE=1 CARELINK_ENABLE_WHATSAPP=0
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 libgl1 libglib2.0-0 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
COPY carelink-handoff/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY carelink-handoff/backend/app ./app
COPY carelink-handoff/backend/manage_mobile.py carelink-handoff/backend/cloud_start.py ./
COPY --from=frontend /build/build /app/frontend/carelink-app/build
RUN groupadd --gid 10001 carelink && useradd --uid 10001 --gid carelink --create-home carelink
EXPOSE 10000
CMD ["python", "cloud_start.py"]
