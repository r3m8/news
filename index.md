---
layout: default
title: News
---

# News

<ul>
{% for summary in site.pages %}
  {% if summary.path contains 'summaries/' %}
    <li><a href="{{ summary.url | relative_url }}">{{ summary.name | replace: '.md', '' }}</a></li>
  {% endif %}
{% endfor %}
</ul>