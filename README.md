# Visor de respaldos de correo

Visor web de **solo consulta** para los respaldos de correo de AG Constructora.
Los correos **no** están en este repositorio: viven en un Vercel Blob store privado.

## Variables de entorno (Vercel)

| Variable | Uso |
|---|---|
| `VIEWER_PASSWORD` | Clave compartida para entrar |
| `AUTH_SECRET` | Secreto para firmar la sesión (`openssl rand -hex 32`) |
| `BLOB_READ_WRITE_TOKEN` | Lo agrega Vercel al conectar el Blob store privado |

## Cargar datos

```bash
python3 scripts/indexar.py ~/Desktop/Respaldo_correos_AG ~/visor-correos-ag/data/index.db
python3 scripts/exportar-indice.py ~/visor-correos-ag/data/index.db ~/visor-correos-ag/data/index.json.gz
vercel env pull .env.local
node --env-file=.env.local scripts/subir-correos.mjs ~/Desktop/Respaldo_correos_AG
node --env-file=.env.local scripts/subir-indice.mjs ~/visor-correos-ag/data/index.json.gz
```

`subir-correos.mjs` es reanudable: si se corta, se vuelve a ejecutar y solo sube lo que falta.
