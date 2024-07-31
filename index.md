---
layout: default
title: News
---

# News

Here are the summaries:

{% for summary in site.pages %}
  {% if summary.path contains 'summaries/' %}
    - [{{ summary.title }}]({{ summary.url | relative_url }})
      {{ summary.content | markdownify }}
  {% endif %}
{% endfor %}