---
layout: default
title: News
---

# News

Here are the summaries:

{% markdown %}
{% for summary in site.pages %}
  {% if summary.path contains 'summaries/' %}
    - [{{ summary.title }}]({{ summary.url | relative_url }})
  {% endif %}
{% endfor %}
{% endmarkdown %}