import React, { useState } from 'react';
import { X, Copy, Check, Terminal, ExternalLink, Code2 } from 'lucide-react';

interface CodeSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  method: string;
  url: string;
  headers?: { key: string; value: string; enabled?: boolean }[];
  params?: { key: string; value: string; enabled?: boolean }[];
  body?: string;
  bodyType?: string;
  onOpenSdkStudio?: () => void;
}

type Lang = 'curl' | 'javascript' | 'typescript' | 'python' | 'go' | 'java';

export const CodeSnippetModal: React.FC<CodeSnippetModalProps> = ({
  isOpen,
  onClose,
  method = 'GET',
  url = 'https://api.example.com',
  headers = [],
  params = [],
  body = '',
  bodyType = 'json',
  onOpenSdkStudio,
}) => {
  const [selectedLang, setSelectedLang] = useState<Lang>('curl');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Build full URL with query parameters
  const enabledParams = params.filter((p) => p.enabled !== false && p.key.trim() !== '');
  let fullUrl = url || 'https://api.example.com';
  if (enabledParams.length > 0) {
    const qs = enabledParams
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
  }

  const enabledHeaders = headers.filter((h) => h.enabled !== false && h.key.trim() !== '');
  const upperMethod = method.toUpperCase();

  const generateCurl = () => {
    let cmd = `curl -X ${upperMethod} "${fullUrl}"`;
    enabledHeaders.forEach((h) => {
      cmd += ` \\\n  -H "${h.key}: ${h.value}"`;
    });
    if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)) {
      if (bodyType === 'form-data') {
        try {
          const items = JSON.parse(body);
          if (Array.isArray(items)) {
            items.filter((i: any) => i.enabled && i.key).forEach((i: any) => {
              if (i.type === 'file') {
                cmd += ` \\\n  -F "${i.key}=@${i.value || 'file.bin'}"`;
              } else {
                cmd += ` \\\n  -F "${i.key}=${i.value}"`;
              }
            });
          }
        } catch {
          cmd += ` \\\n  -d "${body}"`;
        }
      } else if (bodyType === 'x-www-form-urlencoded') {
        try {
          const items = JSON.parse(body);
          if (Array.isArray(items)) {
            const encoded = items
              .filter((i: any) => i.enabled && i.key)
              .map((i: any) => `${encodeURIComponent(i.key)}=${encodeURIComponent(i.value)}`)
              .join('&');
            cmd += ` \\\n  -H "Content-Type: application/x-www-form-urlencoded"`;
            cmd += ` \\\n  --data "${encoded}"`;
          }
        } catch {
          cmd += ` \\\n  -d "${body}"`;
        }
      } else {
        const sanitized = body.replace(/"/g, '\\"').replace(/\n/g, '');
        cmd += ` \\\n  -d "${sanitized}"`;
      }
    }
    return cmd;
  };

  const generateJavaScript = () => {
    const headersObj: Record<string, string> = {};
    enabledHeaders.forEach((h) => {
      headersObj[h.key] = h.value;
    });

    let code = `// Vanilla JavaScript (Fetch API)\n`;
    if (bodyType === 'form-data') {
      code += `const formData = new FormData();\n`;
      try {
        const items = JSON.parse(body);
        if (Array.isArray(items)) {
          items.filter((i: any) => i.enabled && i.key).forEach((i: any) => {
            code += `formData.append("${i.key}", "${i.value}");\n`;
          });
        }
      } catch {}
      code += `\nconst response = await fetch("${fullUrl}", {\n`;
      code += `  method: "${upperMethod}",\n`;
      if (enabledHeaders.length > 0) {
        code += `  headers: ${JSON.stringify(headersObj, null, 4).replace(/\n/g, '\n  ')},\n`;
      }
      code += `  body: formData,\n`;
      code += `});\n\n`;
    } else if (bodyType === 'x-www-form-urlencoded') {
      code += `const formParams = new URLSearchParams();\n`;
      try {
        const items = JSON.parse(body);
        if (Array.isArray(items)) {
          items.filter((i: any) => i.enabled && i.key).forEach((i: any) => {
            code += `formParams.append("${i.key}", "${i.value}");\n`;
          });
        }
      } catch {}
      headersObj['Content-Type'] = headersObj['Content-Type'] || 'application/x-www-form-urlencoded';
      code += `\nconst response = await fetch("${fullUrl}", {\n`;
      code += `  method: "${upperMethod}",\n`;
      code += `  headers: ${JSON.stringify(headersObj, null, 4).replace(/\n/g, '\n  ')},\n`;
      code += `  body: formParams,\n`;
      code += `});\n\n`;
    } else {
      code += `const response = await fetch("${fullUrl}", {\n`;
      code += `  method: "${upperMethod}",\n`;
      if (enabledHeaders.length > 0) {
        code += `  headers: ${JSON.stringify(headersObj, null, 4).replace(/\n/g, '\n  ')},\n`;
      }
      if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)) {
        try {
          const parsed = JSON.parse(body);
          code += `  body: JSON.stringify(${JSON.stringify(parsed, null, 4).replace(/\n/g, '\n  ')}),\n`;
        } catch {
          code += `  body: ${JSON.stringify(body)},\n`;
        }
      }
      code += `});\n\n`;
    }
    code += `const data = await response.json();\n`;
    code += `console.log(data);`;
    return code;
  };

  const generateTypeScript = () => {
    let code = `// TypeScript / Axios\n`;
    code += `import axios from 'axios';\n\n`;
    code += `async function executeRequest() {\n`;
    code += `  const response = await axios({\n`;
    code += `    method: "${upperMethod.toLowerCase()}",\n`;
    code += `    url: "${fullUrl}",\n`;
    if (enabledHeaders.length > 0) {
      const headersObj: Record<string, string> = {};
      enabledHeaders.forEach((h) => {
        headersObj[h.key] = h.value;
      });
      code += `    headers: ${JSON.stringify(headersObj, null, 6).replace(/\n/g, '\n    ')},\n`;
    }
    if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)) {
      try {
        const parsed = JSON.parse(body);
        code += `    data: ${JSON.stringify(parsed, null, 6).replace(/\n/g, '\n    ')},\n`;
      } catch {
        code += `    data: ${JSON.stringify(body)},\n`;
      }
    }
    code += `  });\n\n`;
    code += `  console.log(response.data);\n`;
    code += `  return response.data;\n`;
    code += `}`;
    return code;
  };

  const generatePython = () => {
    let code = `# Python (requests)\n`;
    code += `import requests\n\n`;
    code += `url = "${fullUrl}"\n`;
    if (enabledHeaders.length > 0) {
      const headersObj: Record<string, string> = {};
      enabledHeaders.forEach((h) => {
        headersObj[h.key] = h.value;
      });
      code += `headers = ${JSON.stringify(headersObj, null, 4)}\n`;
    }
    if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)) {
      try {
        const parsed = JSON.parse(body);
        code += `payload = ${JSON.stringify(parsed, null, 4)}\n\n`;
        code += `response = requests.${upperMethod.toLowerCase()}(url, json=payload${
          enabledHeaders.length > 0 ? ', headers=headers' : ''
        })\n`;
      } catch {
        code += `payload = """${body}"""\n\n`;
        code += `response = requests.${upperMethod.toLowerCase()}(url, data=payload${
          enabledHeaders.length > 0 ? ', headers=headers' : ''
        })\n`;
      }
    } else {
      code += `\nresponse = requests.${upperMethod.toLowerCase()}(url${
        enabledHeaders.length > 0 ? ', headers=headers' : ''
      })\n`;
    }
    code += `print(response.json())`;
    return code;
  };

  const generateGo = () => {
    let code = `// Go (net/http)\n`;
    code += `package main\n\n`;
    code += `import (\n`;
    if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)) {
      code += `\t"bytes"\n`;
    }
    code += `\t"fmt"\n`;
    code += `\t"io"\n`;
    code += `\t"net/http"\n`;
    code += `)\n\n`;
    code += `func main() {\n`;
    code += `\turl := "${fullUrl}"\n`;
    if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)) {
      code += `\tpayload := []byte(\`${body}\`)\n`;
      code += `\treq, _ := http.NewRequest("${upperMethod}", url, bytes.NewBuffer(payload))\n`;
    } else {
      code += `\treq, _ := http.NewRequest("${upperMethod}", url, nil)\n`;
    }
    enabledHeaders.forEach((h) => {
      code += `\treq.Header.Set("${h.key}", "${h.value}")\n`;
    });
    code += `\n\tclient := &http.Client{}\n`;
    code += `\tresp, err := client.Do(req)\n`;
    code += `\tif err != nil {\n\t\tpanic(err)\n\t}\n`;
    code += `\tdefer resp.Body.Close()\n\n`;
    code += `\tbody, _ := io.ReadAll(resp.Body)\n`;
    code += `\tfmt.Println(string(body))\n`;
    code += `}`;
    return code;
  };

  const generateJava = () => {
    let code = `// Java 11+ (java.net.http.HttpClient)\n`;
    code += `import java.net.URI;\n`;
    code += `import java.net.http.HttpClient;\n`;
    code += `import java.net.http.HttpRequest;\n`;
    code += `import java.net.http.HttpResponse;\n\n`;
    code += `public class ClientDemo {\n`;
    code += `    public static void main(String[] args) throws Exception {\n`;
    code += `        HttpRequest request = HttpRequest.newBuilder()\n`;
    code += `            .uri(URI.create("${fullUrl}"))\n`;
    enabledHeaders.forEach((h) => {
      code += `            .header("${h.key}", "${h.value}")\n`;
    });
    if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)) {
      const sanitized = body.replace(/"/g, '\\"').replace(/\n/g, '');
      code += `            .method("${upperMethod}", HttpRequest.BodyPublishers.ofString("${sanitized}"))\n`;
    } else {
      code += `            .method("${upperMethod}", HttpRequest.BodyPublishers.noBody())\n`;
    }
    code += `            .build();\n\n`;
    code += `        HttpResponse<String> response = HttpClient.newHttpClient()\n`;
    code += `            .send(request, HttpResponse.BodyHandlers.ofString());\n\n`;
    code += `        System.out.println(response.body());\n`;
    code += `    }\n`;
    code += `}`;
    return code;
  };

  const getCode = () => {
    switch (selectedLang) {
      case 'curl':
        return generateCurl();
      case 'javascript':
        return generateJavaScript();
      case 'typescript':
        return generateTypeScript();
      case 'python':
        return generatePython();
      case 'go':
        return generateGo();
      case 'java':
        return generateJava();
    }
  };

  const currentCode = getCode();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const languages: { id: Lang; label: string; badge: string }[] = [
    { id: 'curl', label: 'cURL', badge: 'CLI' },
    { id: 'javascript', label: 'JavaScript', badge: 'Fetch' },
    { id: 'typescript', label: 'TypeScript', badge: 'Axios' },
    { id: 'python', label: 'Python', badge: 'Requests' },
    { id: 'go', label: 'Go', badge: 'net/http' },
    { id: 'java', label: 'Java', badge: 'HttpClient' },
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-[780px] max-h-[85vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Generate Code Snippet</h3>
              <p className="text-[11px] text-slate-400">
                Ready-to-use client code for <span className="font-mono text-cyan-300">{upperMethod} {fullUrl}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Language Tabs Rail */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            {languages.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedLang(l.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  selectedLang === l.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <span>{l.label}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                  selectedLang === l.id ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-500'
                }`}>
                  {l.badge}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-white" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Snippet</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content Box */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-950">
          <pre className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed selection:bg-blue-600 selection:text-white">
            <code>{currentCode}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between text-xs text-slate-400">
          <span>Need full typed classes for all your collection APIs?</span>
          {onOpenSdkStudio && (
            <button
              onClick={() => {
                onClose();
                onOpenSdkStudio();
              }}
              className="text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <span>Open Full SDK Studio</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
