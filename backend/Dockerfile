# Stage 1: Build & Sync dependencies with uv
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim AS builder

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

# Install dependencies before code to leverage Docker layer caching
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-install-project --no-dev

# Copy application code
COPY ./app ./app
RUN uv sync --frozen --no-dev

# Stage 2: Runtime Image
FROM python:3.11-slim-bookworm

WORKDIR /app

# Copy the virtual environment and app from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/app /app/app

# Set PATH so executables in .venv are prioritized
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
