---
layout: default
title: News
---

{% for summary in site.pages %}
  {% if summary.path contains 'summaries/' %}
    - [{{ summary.title }}]({{ summary.url | relative_url }})
  {% endif %}
{% endfor %}