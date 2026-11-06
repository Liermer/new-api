package middleware

import (
	"bytes"
	"compress/gzip"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type countingFrontendFS struct {
	static.ServeFileSystem
	opens atomic.Int32
}

func (f *countingFrontendFS) Open(name string) (http.File, error) {
	// Looking for a precompressed sibling is not a read of the file itself.
	if !strings.HasSuffix(name, ".br") {
		f.opens.Add(1)
	}
	return f.ServeFileSystem.Open(name)
}

func performFrontendRequest(router http.Handler, method, target, acceptEncoding string) *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(method, target, nil)
	if acceptEncoding != "" {
		request.Header.Set("Accept-Encoding", acceptEncoding)
	}
	router.ServeHTTP(recorder, request)
	return recorder
}

func TestServeFrontendFilesCompressesEachFileOnce(t *testing.T) {
	gin.SetMode(gin.TestMode)
	frontendDir := t.TempDir()
	script := []byte(strings.Repeat("export const answer = 42;\n", 400))
	image := []byte("\x89PNG\r\n\x1a\nnot-really-an-image")
	require.NoError(t, os.MkdirAll(filepath.Join(frontendDir, "static", "js"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(frontendDir, "static", "js", "app.js"), script, 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(frontendDir, "logo.png"), image, 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(frontendDir, "index.html"), []byte("<html></html>"), 0o644))
	frontendFS := &countingFrontendFS{ServeFileSystem: static.LocalFile(frontendDir, false)}

	router := gin.New()
	router.NoRoute(ServeFrontendFiles(frontendFS), func(c *gin.Context) {
		c.String(http.StatusTeapot, "fallback")
	})

	plain := performFrontendRequest(router, http.MethodGet, "/static/js/app.js", "")
	require.Equal(t, http.StatusOK, plain.Code)
	assert.Empty(t, plain.Header().Get("Content-Encoding"))
	assert.Equal(t, script, plain.Body.Bytes())
	frontendFS.opens.Store(0)

	responses := make([]*httptest.ResponseRecorder, 8)
	var wg sync.WaitGroup
	for i := range responses {
		wg.Go(func() {
			responses[i] = performFrontendRequest(router, http.MethodGet, "/static/js/app.js", "gzip, deflate, br")
		})
	}
	wg.Wait()
	for _, response := range responses {
		require.Equal(t, http.StatusOK, response.Code)
		assert.Equal(t, "gzip", response.Header().Get("Content-Encoding"))
		assert.Equal(t, "Accept-Encoding", response.Header().Get("Vary"))
		assert.Equal(t, plain.Header().Get("Content-Type"), response.Header().Get("Content-Type"))
		assert.Equal(t, strconv.Itoa(response.Body.Len()), response.Header().Get("Content-Length"))
		assert.Equal(t, responses[0].Body.Bytes(), response.Body.Bytes())
	}
	reader, err := gzip.NewReader(bytes.NewReader(responses[0].Body.Bytes()))
	require.NoError(t, err)
	decoded, err := io.ReadAll(reader)
	require.NoError(t, err)
	assert.Equal(t, script, decoded)

	head := performFrontendRequest(router, http.MethodHead, "/static/js/app.js", "gzip")
	assert.Equal(t, http.StatusOK, head.Code)
	assert.Equal(t, "gzip", head.Header().Get("Content-Encoding"))
	assert.Equal(t, strconv.Itoa(responses[0].Body.Len()), head.Header().Get("Content-Length"))
	assert.Empty(t, head.Body.Bytes())
	assert.Equal(t, int32(1), frontendFS.opens.Load(), "the file must be read and compressed once")

	png := performFrontendRequest(router, http.MethodGet, "/logo.png", "gzip")
	assert.Equal(t, http.StatusOK, png.Code)
	assert.Empty(t, png.Header().Get("Content-Encoding"))
	assert.Equal(t, image, png.Body.Bytes())

	index := performFrontendRequest(router, http.MethodGet, "/index.html", "gzip")
	assert.Equal(t, http.StatusMovedPermanently, index.Code)
	assert.Equal(t, "./", index.Header().Get("Location"))

	missing := performFrontendRequest(router, http.MethodGet, "/static/js/missing.js", "gzip")
	assert.Equal(t, http.StatusTeapot, missing.Code)
	assert.Equal(t, "fallback", missing.Body.String())
}

func TestServeFrontendFilesPrefersPrecompressedBrotli(t *testing.T) {
	gin.SetMode(gin.TestMode)
	frontendDir := t.TempDir()
	script := []byte(strings.Repeat("export const answer = 42;\n", 400))
	brotliBody := []byte("precompressed brotli bytes")
	unpairedStyle := []byte(strings.Repeat("body { color: red }\n", 400))
	require.NoError(t, os.MkdirAll(filepath.Join(frontendDir, "static", "js"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(frontendDir, "static", "js", "app.js"), script, 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(frontendDir, "static", "js", "app.js.br"), brotliBody, 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(frontendDir, "static", "style.css"), unpairedStyle, 0o644))
	frontendFS := static.LocalFile(frontendDir, false)

	router := gin.New()
	router.NoRoute(ServeFrontendFiles(frontendFS))

	brotli := performFrontendRequest(router, http.MethodGet, "/static/js/app.js", "gzip, deflate, br")
	require.Equal(t, http.StatusOK, brotli.Code)
	assert.Equal(t, "br", brotli.Header().Get("Content-Encoding"))
	assert.Equal(t, "Accept-Encoding", brotli.Header().Get("Vary"))
	assert.Contains(t, brotli.Header().Get("Content-Type"), "javascript", "the type comes from the original file, not the .br name")
	assert.Equal(t, strconv.Itoa(len(brotliBody)), brotli.Header().Get("Content-Length"))
	assert.Equal(t, brotliBody, brotli.Body.Bytes())

	head := performFrontendRequest(router, http.MethodHead, "/static/js/app.js", "br")
	assert.Equal(t, http.StatusOK, head.Code)
	assert.Equal(t, "br", head.Header().Get("Content-Encoding"))
	assert.Equal(t, strconv.Itoa(len(brotliBody)), head.Header().Get("Content-Length"))
	assert.Empty(t, head.Body.Bytes())

	gzipOnly := performFrontendRequest(router, http.MethodGet, "/static/js/app.js", "gzip")
	require.Equal(t, http.StatusOK, gzipOnly.Code)
	assert.Equal(t, "gzip", gzipOnly.Header().Get("Content-Encoding"))

	noBuildOutput := performFrontendRequest(router, http.MethodGet, "/static/style.css", "br, gzip")
	require.Equal(t, http.StatusOK, noBuildOutput.Code)
	assert.Equal(t, "gzip", noBuildOutput.Header().Get("Content-Encoding"), "a file without a .br sibling falls back to gzip")
}

func TestCacheMarksHashedBuildFilesImmutable(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.NoRoute(Cache(), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	tests := []struct {
		target string
		want   string
	}{
		{target: "/", want: "no-cache"},
		{target: "/static/js/index.2b8f2d494c.js", want: "public, max-age=31536000, immutable"},
		{target: "/static/font/ibm-plex-sans-latin-400-normal.13a15bcdfe.woff2", want: "public, max-age=31536000, immutable"},
		{target: "/logo.png", want: "max-age=604800"},
		{target: "/staticfile.js", want: "max-age=604800"},
	}
	for _, tt := range tests {
		t.Run(tt.target, func(t *testing.T) {
			response := performFrontendRequest(router, http.MethodGet, tt.target, "")
			assert.Equal(t, tt.want, response.Header().Get("Cache-Control"))
		})
	}
}
