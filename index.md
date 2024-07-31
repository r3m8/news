---
layout: default
title: News
---

# News

Here are the summaries:

{% for summary in site.pages %}
  {% if summary.path contains 'summaries/' %}
    - <a href="{{ summary.url | relative_url }}">{{ summary.title }}</a>
  {% endif %}
{% endfor %}