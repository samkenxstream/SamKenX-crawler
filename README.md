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

## TODO

* Update config.json to accept a `targets` property (array). When specified,
  crawler only goes to the pages in that array. `entrypoint` should be omitted in this case.
  On the other hand, maybe we should just fork this into a separate project. Need to
  share code as much as possible, though.