# crawler

A tool to help you get a complete view of all of your documentation site's pages.

## Configuration object shape

```
{
  "entrypoint": "https://developer.chrome.com/extensions",
  "categories": [
    {
      "selector": "div.api[itemprop=\"articleBody\"]",
      "id": "api"
    },
    …
  ]
}
```