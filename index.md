---
layout: default
title: News
---

# News

<ul>
  {% for file in site.static_files %}
    {% if file.path contains 'summaries/' %}
      <li>
        <a href="{{ file.path | relative_url }}">{{ file.name }}</a>
      </li>
    {% endif %}
  {% endfor %}
</ul>